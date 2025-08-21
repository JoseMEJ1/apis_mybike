const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Conexión a MongoDB Atlas - CONEXIÓN MEJORADA
const dbURI = "mongodb+srv://admin:123@cluster0.7wbet4i.mongodb.net/DHT11?retryWrites=true&w=majority&appName=Cluster0";

// Configuración mejorada de Mongoose
mongoose.set('strictQuery', false);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
            socketTimeoutMS: 45000, // Timeout de socket de 45 segundos
        });
        
        console.log(' Conectado a MongoDB Atlas');
        console.log(`Base de datos: ${conn.connection.name}`);
        console.log(`Colección: ${conn.connection.collections.length} colecciones`);
        
    } catch (error) {
        console.log(' Error de conexión a MongoDB:', error.message);
        process.exit(1); // Salir si no puede conectar
    }
};

// Conectar a la base de datos
connectDB();

// Esquema de datos del sensor
const sensorSchema = new mongoose.Schema({
    temperatura: {
        type: Number,
        required: true,
        min: -50,
        max: 100
    },
    humedad: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    deviceId: {
        type: String,
        default: 'ESP32_DHT11'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'data'
});

const SensorData = mongoose.model('SensorData', sensorSchema);

// Middleware para verificar conexión a BD
const checkDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: 'Base de datos no conectada',
            error: 'Intenta nuevamente en unos momentos'
        });
    }
    next();
};

// 1. 📝 POST - Crear nuevo registro
app.post('/api/sensor-data', checkDBConnection, async (req, res) => {
    try {
        const { temperatura, humedad, deviceId } = req.body;
        
        if (temperatura === undefined || humedad === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Temperatura y humedad son requeridos'
            });
        }

        const newData = new SensorData({ 
            temperatura: parseFloat(temperatura), 
            humedad: parseFloat(humedad),
            deviceId: deviceId || 'ESP32_DHT11'
        });

        const savedData = await newData.save();
        
        res.status(201).json({
            success: true,
            message: 'Datos guardados correctamente',
            data: savedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al guardar datos',
            error: error.message
        });
    }
});

// 2. 📋 GET - Obtener todos los registros
app.get('/api/sensor-data', checkDBConnection, async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 }).maxTimeMS(10000);
        res.json({
            success: true,
            data: data,
            total: data.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos',
            error: error.message
        });
    }
});

// 3. ✏️ PUT - Actualizar registro
app.put('/api/sensor-data/:id', checkDBConnection, async (req, res) => {
    try {
        const { temperatura, humedad } = req.body;
        
        if (temperatura === undefined && humedad === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere temperatura o humedad para actualizar'
            });
        }

        const updateData = {};
        if (temperatura !== undefined) updateData.temperatura = parseFloat(temperatura);
        if (humedad !== undefined) updateData.humedad = parseFloat(humedad);

        const updatedData = await SensorData.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedData) {
            return res.status(404).json({
                success: false,
                message: 'Registro no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Registro actualizado correctamente',
            data: updatedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el registro',
            error: error.message
        });
    }
});

// 4. 🗑️ DELETE - Eliminar registro
app.delete('/api/sensor-data/:id', checkDBConnection, async (req, res) => {
    try {
        const deletedData = await SensorData.findByIdAndDelete(req.params.id);
        
        if (!deletedData) {
            return res.status(404).json({
                success: false,
                message: 'Registro no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Registro eliminado correctamente',
            data: deletedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el registro',
            error: error.message
        });
    }
});

// Ruta de verificación de estado
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const statusMessages = [
        'desconectado',
        'conectado',
        'conectando',
        'desconectando'
    ];
    
    res.json({
        success: dbStatus === 1,
        message: `Estado de MongoDB: ${statusMessages[dbStatus]}`,
        database: {
            status: statusMessages[dbStatus],
            readyState: dbStatus
        }
    });
});

// Ruta de información
app.get('/', (req, res) => {
    res.json({
        message: 'API para sensor DHT11 con MongoDB',
        endpoints: {
            'POST': '/api/sensor-data',
            'GET': '/api/sensor-data',
            'PUT': '/api/sensor-data/:id',
            'DELETE': '/api/sensor-data/:id',
            'HEALTH': '/api/health'
        }
    });
});

// Manejo de errores 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        url: req.originalUrl
    });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(` Servidor corriendo en puerto ${port}`);
    console.log(` Health check disponible en: http://localhost:${port}/api/health`);
});