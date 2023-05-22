import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'default.jpeg' })
  photo: string;

  @Column({ default: false })
  active: boolean;

  @Column({ default: 'user' })
  role: string;

  @Column()
  nocTransfer: number;

  @Column({ nullable: true })
  firstLogin: Date;

  @Column({ nullable: true })
  lastLogin: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
