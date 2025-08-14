const mongoose = require("mongoose");
require('dotenv').config();

const mongoUrl = process.env.MONGO_URL;
mongoose.connect(mongoUrl);

mongoose.connection.on('connected', () => {
  console.log('Conexión a MongoDB establecida');
});

mongoose.connection.on('error', (err) => {
  console.error('Error de conexión a MongoDB:', err);
});
// Esquema para impactos (mediciones)
const impactosSchema = new mongoose.Schema(
    {
        id_dispositivo: { type: mongoose.Schema.Types.ObjectId, ref: 'dispositivos' },
        valor: Number,
        fecha_de_impacto: Date
    },
    { versionKey: false }
);

// Esquema para dispositivos
const dispositivosSchema = new mongoose.Schema(
    {
        gps: {
            latitud: Number,
            longitud: Number
        },
        fecha_de_actualizacion: Date,
        hora_de_actualizacion: String,
        estatus: { type: String, default: 'activo' }
    },
    { versionKey: false }
);

// Esquema para rutas
const rutasSchema = new mongoose.Schema(
    {
        id_dispositivo: { type: mongoose.Schema.Types.ObjectId, ref: 'dispositivos' },
        nombre_ruta: String,
        ubicacion_de_inicio: {
            latitud: Number,
            longitud: Number
        },
        ubicacion_de_final: {
            latitud: Number,
            longitud: Number
        },
        fecha_de_inicio: Date,
        fecha_de_final: Date
    },
    { versionKey: false }
);

// Esquema para usuarios
const usuariosSchema = new mongoose.Schema(
    {
        nombre: String,
        apellido: String,
        correo: { type: String, unique: true },
        contrasenia: String,
        tipo: { type: String, enum: ['administrador', 'usuario'], default: 'usuario' },
        fecha_registro: { type: Date, default: Date.now },
        id_dispositivo: { type: mongoose.Schema.Types.ObjectId, ref: 'dispositivos' }
    },
    { versionKey: false }
);

// Esquema para botones de pánico
const botonPanicoSchema = new mongoose.Schema(
    {
        id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'usuarios' },
        id_dispositivo: { type: mongoose.Schema.Types.ObjectId, ref: 'dispositivos' },
        estatus: { type: String, enum: ['activo', 'inactivo', 'emergencia'], default: 'activo' }
    },
    { versionKey: false }
);

module.exports = {
    impactos: mongoose.model("impactos", impactosSchema),
    dispositivos: mongoose.model("dispositivos", dispositivosSchema),
    rutas: mongoose.model("rutas", rutasSchema),
    usuarios: mongoose.model("usuarios", usuariosSchema),
    botonesPanico: mongoose.model("botones_panico", botonPanicoSchema)
};