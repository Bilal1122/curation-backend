const swaggerJSDoc = require('swagger-jsdoc');

// swagger options
let swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'Curation Portal.',
      description: 'Node.js REST - API.',
      contact: {
        name: 'Hadi Tariq.',
        email: 'hadi.tariq02@gmail.com'
      },
      servers: ['http://localhost:5000/', 'https://curationportal-api.herokuapp.com/']
    }
  },
  apis: ['./routes/*.js', './routes/*/*.js']
};

// connect to swagger
const swaggerDocs = swaggerJSDoc(swaggerOptions);

module.exports = swaggerDocs; //export
