/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var ObjectId = require('mongodb').ObjectID;

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
 
module.exports = function (app) {

  app.route('/api/issues/:project')
  
    .get(function (req, res){
      var project = req.params.project;
      const query   = req.query;
    
      if ( query._id ) query._id  = new ObjectId( query._id );
      if ( query.open === '' || query.open === 'true' )  query.open = true;
      else if ( query.open === 'false' )                 query.open = false;
    
    MongoClient.connect( CONNECTION_STRING )
      .then( db => {
        const collection = db.collection( project );
        collection.find( query ).sort( { updated_on: -1 } ).toArray( ( error,doc ) => {
          if ( !error ) res.json( doc );
          else          res.send( error );
        } );

      } )
      .catch( error => {
        res.send( error ) 
      } );    
       
    })
    
    .post(function (req, res){
      var project = req.params.project;
      const body = req.body;
    
      const newEntry = {
        issue_title: body.issue_title,
        issue_text: body.issue_text,
        created_by: body.created_by,
        created_on: new Date(),
        updated_on: new Date(),
        assigned_to: body.assigned_to || "",
        status_text: body.status_text || "",
        open: true
      }
    
      if (body.issue_title === undefined || (body.issue_text === undefined || body.created_by === undefined)) 
        return res.type('text').send('missing inputs')
      
      MongoClient.connect(CONNECTION_STRING, function(err, db) {
        db.collection(project).insertOne(newEntry, (err, docs) => {
          if (err) res.json(err);
          res.json(docs.ops[0]);
          
          db.close();
        });
      });
    
    })
    
    .put(function (req, res){
      var project = req.params.project; 
      const inputs      = req.body;
      const issueID     = inputs._id;

      try {
        ObjectId(issueID)
      } catch(err) {
        return res.type('text').send('could not update '+issueID);
      }
    
      delete inputs._id;            // Delete from object to check if all other inputs are empty.
      for ( let input in inputs ) { // Delete all empty properties and sanitize.
        if ( !inputs[ input ] && input !== 'open' )
          delete inputs[ input ];
        else
          inputs[ input ] = ( inputs[ input ] );
      }

      if ( Object.keys( inputs ).length > 0 ) {
        // Assigned here just to meet the user stories.
        // If assigned before, an empty form could be sent.
        inputs.open       = !inputs.open;
        inputs.updated_on = Date.now( );

        MongoClient.connect( CONNECTION_STRING ) // Connect to DB and update document.
        .then( db => {
          const collection = db.collection( project );
          collection.findAndModify(
            { _id: new ObjectId( issueID ) },
            [ [ '_id',1 ] ],
            { $set: inputs },
            { new: true } )  // Returns the updated collection.
              .then( doc => res.send( 'successfully updated' ) )
              .catch( error => res.send( error ) )
        } )
        .catch( error => res.send( error ) );
      } else {
        res.send( 'no updated field sent' );
      }    
      
    })
    
  
    .delete(function (req, res){
      var project = req.params.project;
      const issueID = req.body._id;
    
      try {
        ObjectId(issueID)
      } catch(err) {
        return res.type('text').send(issueID + ' error');
      }
    

      if ( issueID ) {
        MongoClient.connect(CONNECTION_STRING, function(err, db) {
          db.collection(project).findOneAndDelete( { _id: new ObjectId( issueID ) }, (err, docs) => {
          if (err) {
            db.close();
            return res.type('text').send('could not delete ' + issueID);
          }
          res.send( `deleted ${issueID}` );
          
          db.close();
        });
      });
    
      }    
    
    });
    
};
