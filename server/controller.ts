/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestTicket, DeadDrop } from './factory';
import { Actions, IRepository } from './interfaces';
import Service from './service';

// Controlers manage data and logic.
export class Controller {
  static async asyncValidation(): Promise<string> {
    let timeoutId;
    try {
      const result: string | PromiseLike<string> = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          resolve(
            `☠️ DeadDrop server is available. ☠️ To make a request submit a PUT request with the following headers: title, payload, password, action.`,
          );
        }, 1);
      });

      return await result;
    } catch (error) {
      timeoutId && clearTimeout(timeoutId);
      console.log('DeadDrop: Error with async request.');
      console.error(error);
      return 'Error';
    }
  }

  static async deaddrop(requestTicket: RequestTicket): Promise<DeadDrop> {
    const repoBlank: IRepository = {
      
      id_dd: '',
      pass_hash: '',
      payload: '',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const emptyDeadDrop = new DeadDrop(requestTicket, repoBlank);
    const password = requestTicket.password;

    try {
      switch (Number(Actions[requestTicket.action])) {
        case 0: {
          // UPDATE PAYLOAD
          return await requestTicket
            .encryptTicket(requestTicket.payload, requestTicket.password)
            .then(async (status: boolean) => {
              if (status) {
                const currentDeadDrop = await Service.readDeadDrop(requestTicket, password);
                if (currentDeadDrop.isEncrypted) {
                  console.log(`DeadDrop: Request ${requestTicket.id} is invalid. Check the password again .`);
                  return emptyDeadDrop;
                } else {
                  return await Service.editPayloadDeadDrop(requestTicket, password);
                }
              } else {
                console.log(`DeadDrop: Unable to encrypt ticket request ${requestTicket.id}. Try requesting again.`);
                return emptyDeadDrop;
              }
            });
        }
        case 1: // change password
          console.log('password');
          return emptyDeadDrop;

        case 2: {
          // UPDATE TITLE
          const newTitle = requestTicket.payload;

          return await requestTicket
            .encryptTicket(requestTicket.payload, requestTicket.password)
            .then(async (status: boolean) => {
              if (status) {
                const currentDeadDrop = await Service.readDeadDrop(requestTicket, password);
                if (currentDeadDrop.isEncrypted) {
                  console.log(`DeadDrop: Request ${requestTicket.id} is invalid. Check the password again .`);
                  return emptyDeadDrop;
                } else {
                  return await Service.deleteDeadDrop(requestTicket).then(async () => {
                    const updateTitleRequest = new RequestTicket(
                      Actions.TITLE,
                      newTitle,
                      password,
                      currentDeadDrop.payload,
                      requestTicket.din,
                    );
                    return await createDeadDrop(updateTitleRequest, password);
                  });
                }
              } else {
                console.log(`DeadDrop: Unable to encrypt ticket request ${requestTicket.id}. Try requesting again.`);
                return emptyDeadDrop;
              }
            });
        }

        case 3: {
          // READ DEAD DROP
          return await requestTicket
            .encryptTicket(requestTicket.payload, requestTicket.password)
            .then(async (status: boolean) => {
              if (status) {
                return await Service.readDeadDrop(requestTicket, password);
              } else {
                return emptyDeadDrop;
              }
            });
        }
        case 4: {
          // CREATE DEAD DROP
          return await createDeadDrop(requestTicket, password);
        }
        case 5: {
          // DELETE DEAD DROP
          return await requestTicket
            .encryptTicket(requestTicket.payload, requestTicket.password)
            .then(async (status: boolean) => {
              if (status) {
                const currentDeadDrop = await Service.readDeadDrop(requestTicket, password);
                if (currentDeadDrop.isEncrypted) {
                  console.log(`DeadDrop: Request ${requestTicket.id} is invalid. Check the password again .`);
                  return emptyDeadDrop;
                } else {
                  return await Service.deleteDeadDrop(requestTicket);
                }
              } else {
                console.log(`DeadDrop: Unable to encrypt ticket request ${requestTicket.id}. Try requesting again.`);
                return emptyDeadDrop;
              }
            });
        }
        default:
          console.log('malformed request');
          return emptyDeadDrop;
          break;
      }
    } catch (error: any) {
      console.log('DeadDrop: Objective Error.');
      console.error(error);
      return emptyDeadDrop;
    }
  }
}

async function createDeadDrop(requestTicket: RequestTicket, password: string): Promise<DeadDrop> {
  return await requestTicket.encryptTicket(requestTicket.payload, requestTicket.password).then(async () => {
    return await Service.newDeadDrop(requestTicket, password).then(async () => {
      return await Service.readDeadDrop(requestTicket, password);
    });
  });
}
