import { CreateDateColumn, UpdateDateColumn, } from "typeorm";

export abstract class BaseEntity {
  @CreateDateColumn({ type: "timestamptz", select: false, },)
  public readonly createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", select: false, },)
  public readonly updatedAt: Date;
}
