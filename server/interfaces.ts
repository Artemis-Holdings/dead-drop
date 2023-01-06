interface IKnexConfig {
  client: string;
  connection: IKnexConfigDeployment;
}

interface IKnexConfigDeployment {
  database: string;
  user: string;
  password: string;
}

export class KnexConfig implements IKnexConfig {
  client = 'pg';
  connection = {
    database: '',
    user: '',
    password: '',
  } as IKnexConfigDeployment;
}

export enum Actions {
  MESSAGE = 0, // update message
  PSW = 1, // update password (not implemented)
  TITLE = 2, // update title
  READ = 3, // read only
  WRITE = 4, // create a dead drop
  DELETE = 5, // delete a dead drop
}

export interface IUserRequest {
  id?: Promise<string> | string;
  din?: string;
  title: string;
  password: string;
  payload: string;
  action: Actions;
}

export interface IDeadDrop {
  id: Promise<string> | string;
  din: string;
  title: string;
  payload: string;
  isEncrypted: boolean;
  ticketPassword: string;
  repositoryHash: string;
  createdAt?: Date;
  updatedAt: Date;
}

export interface IRepository {
  id_local?: string;
  id_dd: string | Promise<string>;
  pass_hash: string;
  payload: string;
  created_at?: Date;
  updated_at: Date;
}
