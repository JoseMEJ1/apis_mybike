const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Middlewares - IMPORTANTE: El orden sí importa
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Manejar preflight requests
app.options('*', cors());

// Conexión a MongoDB Atlas
const dbURI = "mongodb+srv://admin:123@cluster0.7wbet4i.mongodb.net/DHT11?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch(err => console.log('Error de conexión:', err));

// Esquema y Modelo
const sensorSchema = new mongoose.Schema({
    temperatura: Number,
    humedad: Number,
    deviceId: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const SensorData = mongoose.model('SensorData', sensorSchema);

// 1. POST - Crear registro
app.post('/api/sensor-data', async (req, res) => {
    try {
        const { temperatura, humedad, deviceId } = req.body;
        
        const newData = new SensorData({
            temperatura,
            humedad,
            deviceId: deviceId || 'ESP32_DHT11'
        });

        const savedData = await newData.save();
        
        res.json({
            success: true,
            message: 'Registro creado',
            data: savedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear registro'
        });
    }
});

// 2. GET - Obtener todos los registros
app.get('/api/sensor-data', async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 });
        res.json({
            success: true,
            data: data,
            total: data.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener registros'
        });
    }
});

// 3. GET - Obtener registro por ID
app.get('/api/sensor-data/:id', async (req, res) => {
    try {
        const data = await SensorData.findById(req.params.id);
        
        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Registro no encontrado'
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener registro'
        });
    }
});

// 4. PUT - Actualizar registro (CORREGIDO)
app.put('/api/sensor-data/:id', async (req, res) => {
    try {
        const { temperatura, humedad } = req.body;
        
        const updateData = {};
        if (temperatura !== undefined) updateData.temperatura = temperatura;
        if (humedad !== undefined) updateData.humedad = humedad;

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
            message: 'Registro actualizado',
            data: updatedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar registro: ' + error.message
        });
    }
});

// 5. DELETE - Eliminar registro (CORREGIDO)
app.delete('/api/sensor-data/:id', async (req, res) => {
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
            message: 'Registro eliminado',
            data: deletedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar registro: ' + error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Ruta de prueba para verificar métodos
app.get('/api/test-methods', (req, res) => {
    res.json({
        success: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        message: 'Todos los métodos están habilitados'
    });
});

// Manejo de errores 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`🧪 Test methods: http://localhost:${port}/api/test-methods`);
});