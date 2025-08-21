const mongoose = require('mongoose');

// Conexión a MongoDB Atlas
const connectDB = async () => {
    try {
        const MONGODB_URI = 'mongodb+srv://admin:123@cluster0.7wbet4i.mongodb.net/DHT11?retryWrites=true&w=majority&appName=Cluster0';
        
        const conn = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

// Esquema y Modelo de SensorData
const sensorDataSchema = new mongoose.Schema({
    temperature: {
        type: Number,
        required: true,
        min: -50,
        max: 100
    },
    humidity: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    deviceId: {
        type: String,
        required: true,
        default: 'ESP32_DHT11'
    },
    location: {
        type: String,
        default: 'Unknown'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'data' // Nombre específico de la colección
});

// Índices para mejor performance
sensorDataSchema.index({ timestamp: -1 });
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

module.exports = { connectDB, SensorData };