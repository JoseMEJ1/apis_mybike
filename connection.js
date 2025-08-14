const mongoose = require("mongoose");
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      retryWrites: true,
      w: 'majority'
    });
    console.log('Conexión a MongoDB establecida');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error);
    process.exit(1); // Salir del proceso con error
  }
};

mongoose.connection.on('connected', () => {
  console.log('Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Error de conexión en Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose desconectado de MongoDB');
});

// Exportar la función de conexión y los modelos
module.exports = {
  connectDB,
  usuarios: mongoose.model("usuarios", require('./schemas/usuarioSchema')),
  dispositivos: mongoose.model("dispositivos", require('./schemas/dispositivoSchema')),
  impactos: mongoose.model("impactos", require('./schemas/impactoSchema')),
  botonesPanico: mongoose.model("botones_panico", require('./schemas/botonPanicoSchema')),
  rutas: mongoose.model("rutas", require('./schemas/rutaSchema'))
};