import type { DeleteResult, EntityTarget, FindManyOptions, FindOneOptions, FindOptionsWhere, InsertResult } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { UnitOfWork } from "../unitOfWork";
export declare abstract class BaseRepository<T> {
    protected readonly entityTarget: EntityTarget<T>;
    protected readonly unitOfWork: UnitOfWork;
    constructor(entityTarget: EntityTarget<T>, unitOfWork: UnitOfWork);
    createQueryBuilder: (alias: string) => import("typeorm").SelectQueryBuilder<T>;
    getTransactionManager: () => import("typeorm").EntityManager;
    addMany(records: Partial<T>[]): Promise<void>;
    add(record: QueryDeepPartialEntity<T>): Promise<InsertResult>;
    update(id: number, partialEntity: QueryDeepPartialEntity<T>): Promise<void>;
    upsert(record: QueryDeepPartialEntity<T>, shouldExcludeNullValues?: boolean): Promise<void>;
    delete(where: FindOptionsWhere<T>): Promise<DeleteResult>;
    findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T | null>;
    findOne(options: FindOneOptions<T>): Promise<T | null>;
    find(options: FindManyOptions<T>): Promise<T[]>;
    count(options: FindManyOptions<T>): Promise<number>;
    findOrCreate(createEntity: QueryDeepPartialEntity<T>, where?: FindOptionsWhere<T>): Promise<T>;
}
