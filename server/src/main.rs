#[macro_use] extern crate rocket;

pub mod factory;
pub mod service;
pub mod controller;
pub mod schema;


// use bincode::de;
use rocket::{tokio::{time::{sleep, Duration}, self}, response};
use std::{io, path::{Path, PathBuf}};
use rocket::{get, routes, response::Redirect, fs::NamedFile};
use crate::factory::Ticket;
use crate::controller::Controller;

use std::io::Cursor;
// use rocket::data::FromData;
use rocket::request::Outcome;
use rocket::http::Status;
use rocket::Request;
use rocket::request::FromRequest;
// use rocket::fs::NamedFile;
// use rocket::Data;
// use rocket;
use rocket::data::{Data, ToByteUnit, ByteUnit};
// use rocket::request;
use serde;
use rocket::response::status;

use rocket::response::{Response, Responder};
use core::iter::once;




#[derive(Debug)]
#[derive(serde::Deserialize)]
pub struct ClientRequest {
    pub din: String,
    pub title: String,
    pub password: String,
    pub message: String,
    pub action: String,
}


#[rocket::async_trait]
impl<'r> FromRequest<'r> for ClientRequest {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> Outcome<Self, Self::Error> {

       // NOTE: I think we need to return the entire object instead of creating an object this way we can handle internode communication in the future.
        fn generate_user_request(req: &Request<'_>) -> Result<ClientRequest, ()> {
            let din = req.headers().get_one("din").unwrap().to_string();
            let title = req.headers().get_one("title").unwrap().to_string();
            let password = req.headers().get_one("password").unwrap().to_string();
            let message = req.headers().get_one("message").unwrap().to_string();
            let action = req.headers().get_one("action").unwrap().to_string();
            Ok( ClientRequest {
                din,
                title,
                password,
                message,
                action,
            })
        }

        match generate_user_request(req) {
            Ok(user_request) => Outcome::Success(user_request),
            Err(_) => Outcome::Failure((Status::BadRequest, ())), // TODO: Add actual err object
        }

    }
}

struct ClientResponse {
    din: String,
    title: String,
    message: String,
    attachment: Vec<u8>,
    notice: String,
}
impl ClientResponse {
    fn bind_ticket(ticket: Ticket) -> Self {
        // let payload = bincode::serialize(&ticket).unwrap();
        Self {
            din: ticket.din,
            title: ticket.title,
            message: ticket.message,
            attachment: ticket.attachment,
            notice: String::new(),
        }
    }
}


#[rocket::async_trait]
impl<'r> Responder<'r, 'static> for ClientResponse {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {



        let res = Response::build()
            .raw_header("server", "DeadDrop")
            .raw_header("din", self.din)
            .raw_header("title", self.title)
            .raw_header("message", self.message)
            .streamed_body( Cursor::new(self.attachment))
            // .raw_header("attachment", Cursor::new(self.attachment))
            .raw_header("notice", self.notice)
            .finalize();
        
        Ok(res)
    }

}



#[post("/api/deaddrop", data = "<body>")]
async fn deaddrop(req: ClientRequest, body: Data<'_> ) -> ClientResponse {

    let attachment = stream_attachement(body).await.unwrap();
    let mut req = Ticket::new(
        req.din, 
        req.title, 
        req.password, 
        req.message, 
        req.action, 
        attachment
    );

    let res = Controller::client_request(&mut req);

    ClientResponse::bind_ticket(res)
}


async fn stream_attachement(data: Data<'_>) -> Result<Vec<u8>, Vec<u8>> {
    let max_upload_size = "1MB".parse().unwrap();
    let attachment = data.open(max_upload_size).into_bytes().await.unwrap();

    if attachment.is_complete() {
        println!("Attachment is complete");
        return Ok(attachment.into_inner());
    } else {
        println!("Attachment is incomplete");
        return Err(Vec::new());
    }

}

// SERVE REACT FILES
#[get("/")]
fn index() -> Redirect {
    Redirect::permanent("/index.html")
}

#[get("/<file..>")]
async fn build_dir(file: PathBuf) -> io::Result<NamedFile> {
    NamedFile::open(Path::new("client_build/").join(file)).await
}

// TEST API
#[get("/api/test/<echo>")]
async fn test(echo: &str) -> String {
    sleep(Duration::from_secs(1)).await;
    return format!(" ☠️ DEAD DROP ONLINE ☠️ \n Awaited for 1 second. \n ECHO: {} \n", echo);
}





#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/", routes![index, build_dir, test, deaddrop])
}



/*
    // SANDBOX TESTS
    // let test_file = fs::read("test.jpg").unwrap();
    // create the ticket
    let mut test_ticket = Ticket::new(
        req.din,
        req.title,
        req.message,
        req.password,
        req.action,
        Vec::new(),
        // test_file,
    );
    let dead_drop = test_ticket.generate_deaddrop();

    Service::create_deaddrop(dead_drop);



    let from_db = Service::read_deaddrop(test_ticket.generate_id());
    // println!("from_db: {:?}", from_db);

    let mut updated_ticket = Ticket::new(
        test_ticket.din,
        "New Title!!".to_string(),
        "hi".to_string(),
        "asdfasdf".to_string(),
        "UPDATE".to_string(),
        Vec::new(),
        // test_file,
    );


    let updated_dead_drop = updated_ticket.generate_deaddrop();
    let updated_obj = Service::update_deaddrop(updated_dead_drop);
    // println!("updated_obj: {:?}", updated_obj);

    let deleted_obj = Service::delete_deaddrop(updated_ticket.generate_id());
 */