/* eslint-disable @typescript-eslint/no-explicit-any */
// Routes are handled here in the index file. Do not handle returns or anything of that sort.
import { Server } from './app';
import { Request, Response } from 'express';
import { Controllers } from './controllers';
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
const controller = new Controllers();

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
    return controller.asyncValidation();
  }

  @routeConfig({
    method: REST.POST,
    path: '/',
  })
  public async deaddrop(req: Request, res: Response) {
    try {
      const ticket: IUserRequest = {
        action: req.headers.action as unknown as Actions,
        title: req.headers.title as string,
        payload: req.headers.payload as string,
        password: req.headers.password as string,
      };
      const values = Object.values(ticket);

      if (values.includes(undefined)) {
        res.status(406).json({
          message: 'Malformed headder',
          error: 'All requests must contain: action, title, payload, and password.',
          stack: 'Not Applicable',
        });
      } else {
        const request = new RequestTicket(ticket.action, ticket.title, ticket.password, ticket.payload);
        controller.deaddrop(request, res);
      }
    } catch (error: any) {
      res.status(501).json({
        message: 'Server cannot accept the client request.',
        error: error.message,
        stack: error.stack,
      });
    }

    // return controller.deaddrop();
  }

  // TODO: Remove paragraph. Auto Migrate on start
  // @routeConfig({
  //   method: REST.POST,
  //   path: '/migrate',
  // })
  // public async migrate() {
  //   return controller.migrate();
  // }

  // TODO: Remove this route before production.
  @routeConfig({
    method: REST.DELETE,
    path: '/drop',
  })
  public async drop() {
    return controller.drop();
  }
}

server.start();
