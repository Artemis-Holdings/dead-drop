/* eslint-disable @typescript-eslint/no-explicit-any */
// Routes are handled here in the index file. Do not handle returns or anything of that sort.
import { Server } from './app';
import { Request, Response } from 'express';
import { Controller } from './controller';
import { RequestTicket } from './factory';
import { Actions, IUserRequest } from './interfaces';

enum REST {
  GET = 'get',
  PUT = 'put',
  POST = 'post',
  PATCH = 'patch',
  DELETE = 'delete',
}

interface IRouteConfigProps {
  method: REST;
  path: string;
}

const server = new Server();
// const controller = new Controllers();

function routeConfig({ method, path }: IRouteConfigProps): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const response = async (req: Request, res: Response) => {
      try {
        const original = await descriptor.value(req, res);

        res.status(200).json(original);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        res.status(500).json({
          message: 'Some error occurred',
          error: error.message,
          stack: error.stack,
        });
      }
    };
    // eslint-disable-next-line security/detect-object-injection
    server.app[method](path, response);
  };
}

export class Routes {
  @routeConfig({
    method: REST.GET,
    path: '/',
  })
  public async root() {
    // console.log('req: ', typeof req.headers.title);
    return Controller.asyncValidation();
  }

  @routeConfig({
    method: REST.POST,
    path: '/',
  })
  public async deaddrop(req: Request, res: Response) {
    try {
      const ticket: IUserRequest = {
        din: req.headers.din as string,
        action: req.headers.action as unknown as Actions,
        title: req.headers.title as string,
        payload: req.headers.payload as string,
        password: req.headers.password as string,
      };
      const values = Object.values(ticket);

      if (values.includes(undefined)) {
        res.status(406).json({
          message: 'Malformed headder',
          error: `All requests must contain: title, payload, password and action. Actions Available: ${Object.keys(
            Actions,
          )}`,
          stack: 'Not Applicable',
        });
      } else {
        // TODO: move the RequestTicket object instanciation to the controller and out of index.
        const request = new RequestTicket(ticket.action, ticket.title, ticket.password, ticket.payload, ticket.din);
        const deadDrop = await Controller.deaddrop(request);
        if (deadDrop.isEncrypted) {
          deadDrop.strip();
          res.status(200).json(deadDrop);
        } else {
          deadDrop.clean();
          res.status(200).json(deadDrop);
        }
      }
    } catch (error: any) {
      res.status(501).json({
        message: 'Server cannot accept the client request.',
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

server.start();
