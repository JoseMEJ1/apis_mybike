const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000; // Render usa puerto 10000

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Conexión a MongoDB Atlas - CONEXIÓN PARA RENDER
const dbURI = "mongodb+srv://admin:123@cluster0.7wbet4i.mongodb.net/DHT11?retryWrites=true&w=majority&appName=Cluster0";

// Configuración mejorada para Render
mongoose.set('strictQuery', false);

const connectDB = async () => {
    try {
        console.log('🔄 Intentando conectar a MongoDB Atlas...');
        
        const conn = await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 segundos timeout
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Conectado a MongoDB Atlas desde Render');
        console.log(`📊 Base de datos: ${conn.connection.name}`);
        
    } catch (error) {
        console.log('❌ Error de conexión a MongoDB:', error.message);
        console.log('ℹ️ Verifica que:');
        console.log('1. Las IPs de Render estén en la lista blanca de MongoDB Atlas');
        console.log('2. El usuario "admin" con contraseña "123" exista');
        console.log('3. La base de datos "DHT11" exista');
        process.exit(1);
    }
};

// Conectar a la base de datos
connectDB();

// Esquema de datos del sensor
const sensorSchema = new mongoose.Schema({
    temperatura: Number,
    humedad: Number,
    deviceId: {
        type: String,
        default: 'ESP32_DHT11'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const SensorData = mongoose.model('SensorData', sensorSchema);

// Routes simples para probar
app.post('/api/sensor-data', async (req, res) => {
    try {
        const { temperatura, humedad } = req.body;
        
        const newData = new SensorData({ 
            temperatura, 
            humedad 
        });

        const savedData = await newData.save();
        
        res.json({
            success: true,
            message: 'Datos guardados',
            data: savedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al guardar datos'
        });
    }
});

app.get('/api/sensor-data', async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 });
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos'
        });
    }
});

// Health check mejorado
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const statusMessages = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
        success: dbStatus === 1,
        status: statusMessages[dbStatus],
        message: dbStatus === 1 ? '✅ MongoDB conectado' : '❌ MongoDB desconectado'
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'API en Render - Sensor DHT11',
        status: 'running'
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/api/health`);
});