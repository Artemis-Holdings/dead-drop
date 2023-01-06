import crypto from 'crypto';
import { Buffer } from 'buffer';
import bcrypt from 'bcryptjs';
import { IUserRequest, IDeadDrop, Actions, IRepository } from './interfaces';
import md5 from 'md5';

const inputEncoding = 'utf8';
const storageEncoding = 'hex';
//const initVector = 'asdfasdf!@#$1234';
const salt = 'salt';
const algorithm = 'aes-256-cbc';
const saltRounds = 12;
const keyLength = 32;

class Cryptogropher {
  // TODO: once we validate that encryption works, try to use the bcrypt salt generator.
  //inputEncodingS = 'utf-8';
  //inputEncoding = 'utf8';
  //storageEncoding = 'hex';

  async encrypter(payload: string, password: string, initVector: string): Promise<string> {
    initVector = this.convert16to32(initVector);

    const output = new Promise<string>((resolve) => {
      crypto.scrypt(password, salt, keyLength, (error: Error | null, key: Buffer) => {
        const cipher = crypto.createCipheriv(algorithm, key, initVector);

        let encrypted = cipher.update(payload, inputEncoding, storageEncoding);
        encrypted += cipher.final(storageEncoding);
        resolve(encrypted);
      });
    });
    return await output;
  }

  async decrypter(payload: string, password: string, initVector: string): Promise<string> {
    initVector = this.convert16to32(initVector);

    const output = new Promise<string>((resolve) => {
      crypto.scrypt(password, salt, keyLength, (error: Error | null, key: Buffer) => {
        const cipher = crypto.createDecipheriv(algorithm, key, initVector);

        let decrypted = cipher.update(payload, storageEncoding, inputEncoding);
        decrypted += cipher.final(inputEncoding);
        resolve(decrypted);
      });
    });
    return await output;
  }

  async hasher(input: string): Promise<string> {
    const hash = new Promise<string>((resolve) => {
      bcrypt.hash(input, saltRounds, (error: Error | null, hash: string) => {
        if (error) {
          console.log('DeadDrop: Hashing Error');
          console.error(error);
        } else {
          resolve(hash);
        }
      });
    });
    return hash;
  }

  async validater(stringA: string, stringB: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      bcrypt.compare(stringA, stringB, (error: Error, response: boolean) => {
        if (error) {
          console.log('DeadDrop: Hashing Error');
          console.error(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  convert16to32(input: string): string {
    return input + input + input + input;
  }
}

export class DeadDrop extends Cryptogropher implements IDeadDrop {
  id: Promise<string> | string;
  din: string;
  title: string;
  payload: string;
  isEncrypted: boolean;
  createdAt: Date | undefined;
  updatedAt: Date;
  ticketPassword: string;
  repositoryHash: string;

  constructor(requestTicket: RequestTicket, repository: IRepository) {
    super();
    this.id = repository.id_dd;
    this.din = requestTicket.din;
    this.title = requestTicket.title;
    this.payload = repository.payload;
    this.isEncrypted = true;
    this.ticketPassword = requestTicket.password;
    this.repositoryHash = repository.pass_hash;
    this.createdAt = repository.created_at;
    this.updatedAt = repository.updated_at;
  }

  // Completely empties the dead drop object.
  strip(): void {
    this.id = '';
    this.din = '';
    this.title = '';
    this.payload = '';
    this.repositoryHash = '';
    this.ticketPassword = '';
    this.createdAt = new Date(Date.UTC(0, 0, 0, 0, 0, 0));
    this.updatedAt = new Date(Date.UTC(0, 0, 0, 0, 0, 0));
  }

  // Removes potentiall sensitive data from the object.
  clean(): void {
    this.id = 'redacted';
    this.repositoryHash = 'redacted';
    this.ticketPassword = 'redacted';
  }

  async decryptDeadDrop(password: string): Promise<void> {
    try {
      const isPasswordMatching = await this.validater(password, this.repositoryHash);
      const deadDropEncryptionState: boolean[] = [this.isEncrypted, isPasswordMatching];

      if (!deadDropEncryptionState.includes(false)) {
        this.payload = await this.decrypter(this.payload, password, this.din);
        this.isEncrypted = false;
      } else {
        console.log(`DeadDrop: Unable to decrypt ${this.id}. Is the password correct?`);
      }
    } catch {
      console.log('DeadDrop: ERROR');
    }
  }
}

export class RequestTicket extends Cryptogropher implements IUserRequest {
  action!: Actions;
  title!: string;
  din: string;
  password!: string;
  payload!: string;
  id: Promise<string> | string;

  constructor(action: Actions, title: string, password: string, payload: string, din: string = '') {
    super();
    this.action = action;
    this.din = din === '' ? this.din16bit() : din;
    this.title = title;
    this.password = password;
    this.payload = payload;
    this.id = this.idGenerator(title, this.din);
  }
  private idGenerator(title: string, din: string): string {
    return md5(title + din);
  }

  private din16bit(): string {
    return Math.random().toString(36).substring(2, 6);
  }

  async encryptTicket(payload: string, password: string): Promise<boolean> {
    try {
      return new Promise<boolean>((resolve) => {
        try {
          this.encrypter(payload, password, this.din).then((encryptedPayload) => {
            this.payload = encryptedPayload;
            this.hasher(password).then((hashedPassword) => {
              this.password = hashedPassword;
              resolve(true);
            });
          });
        } catch (error) {
          console.log(error);
          resolve(false);
        }
      });
    } catch (error) {
      return new Promise<boolean>(() => {
        return false;
      });
    }
  }
}
