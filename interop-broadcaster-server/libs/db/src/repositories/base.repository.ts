import { Injectable, } from "@nestjs/common";
import type {
  DeleteResult,EntityMetadata,
  EntityTarget, FindManyOptions, FindOneOptions, FindOptionsWhere, InsertResult,
} from "typeorm";
import { QueryDeepPartialEntity, } from "typeorm/query-builder/QueryPartialEntity";

import { UnitOfWork, } from "../unitOfWork";

const BATCH_SIZE = 1000;

@Injectable()
export abstract class BaseRepository<T,> {
  public constructor(protected readonly entityTarget: EntityTarget<T>, protected readonly unitOfWork: UnitOfWork,) {}

  public createQueryBuilder = (alias: string,) => {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return transactionManager.createQueryBuilder(this.entityTarget, alias,);
  };

  public getTransactionManager = () => {
    return this.unitOfWork.getTransactionManager();
  };

  public async addMany(records: Partial<T>[],): Promise<void> {
    if (!records?.length) {
      return;
    }

    const transactionManager = this.unitOfWork.getTransactionManager();

    let recordsToAdd = [];
    for (let i = 0; i < records.length; i++) {
      recordsToAdd.push(records[i],);
      if (recordsToAdd.length === BATCH_SIZE || i === records.length - 1) {
        await transactionManager.insert<T>(this.entityTarget, recordsToAdd,);
        recordsToAdd = [];
      }
    }
  }

  public add(record: QueryDeepPartialEntity<T>,): Promise<InsertResult> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return transactionManager.insert<T>(this.entityTarget, record,);
  }

  public async update(id: number, partialEntity: QueryDeepPartialEntity<T>,): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update<T>(this.entityTarget, { id, }, partialEntity,);
  }

  // Do not use upsert for tables with auto-incremented fields, each update also increases sequence for the next insert
  public async upsert(
    record: QueryDeepPartialEntity<T>,
    shouldExcludeNullValues = true,
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();

    // Get metadata for the entity
    const metadata: EntityMetadata = transactionManager.connection.getMetadata(this.entityTarget,);

    // Automatically determine conflict paths (unique constraints)
    const conflictPaths = metadata.indices
      .filter((index,) => index.isUnique,)
      .flatMap((index,) => index.columns.map((column,) => column.propertyName,),);

    // Fallback: Use primary columns if no unique indexes found
    if (conflictPaths.length === 0) {
      conflictPaths.push(...metadata.primaryColumns.map((col,) => col.propertyName,),);
    }

    // Exclude null/undefined values if specified
    const recordToUpsert = shouldExcludeNullValues
      ? Object.fromEntries(Object.entries(record,).filter(([ , v, ],) => v !== null && v !== undefined,),)
      : record;

    await transactionManager.upsert<T>(this.entityTarget, recordToUpsert as any, {
      conflictPaths,
      skipUpdateIfNoValuesChanged: true,
    },);
  }

  public delete(where: FindOptionsWhere<T>,): Promise<DeleteResult> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return transactionManager.delete<T>(this.entityTarget, where,);
  }

  public async findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[],): Promise<T | null> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOneBy(this.entityTarget, where,);
  }

  public async findOne(options: FindOneOptions<T>,): Promise<T | null> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne(this.entityTarget, options,);
  }

  public async find(options: FindManyOptions<T>,): Promise<T[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find(this.entityTarget, options,);
  }

  public async count(options: FindManyOptions<T>,): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.count(this.entityTarget, options,);
  }

  public async findOrCreate(
    createEntity: QueryDeepPartialEntity<T>,
    where?: FindOptionsWhere<T>,
  ): Promise<T> {
    const transactionManager = this.unitOfWork.getTransactionManager();
  
    // Default `where` to `createEntity` if not provided
    const searchCriteria = where ?? (createEntity as FindOptionsWhere<T>);
  
    let entity = await transactionManager.findOneBy<T>(this.entityTarget, searchCriteria,);
  
    if (!entity) {
      const insertResult = await transactionManager.insert<T>(this.entityTarget, createEntity,);
      const id = insertResult.identifiers[0]?.id;
      if (id) {
        entity = await transactionManager.findOneBy<T>(this.entityTarget, { id, } as FindOptionsWhere<T>,);
      }
    }
  
    return entity!;
  }  
}
