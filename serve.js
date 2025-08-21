const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

// Crear una instancia de la aplicación Express
const app = express();
const port = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Conexión a MongoDB Atlas
const dbURI = "mongodb+srv://admin:123@cluster0.7wbet4i.mongodb.net/DHT11?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch((err) => console.log('Error de conexión:', err));

// Definir el esquema de los datos del sensor
const sensorSchema = new mongoose.Schema({
    temperatura: {
        type: Number,
        required: true
    },
    humedad: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'data' // Nombre de la colección en MongoDB
});

// Crear el modelo basado en el esquema
const SensorData = mongoose.model('SensorData', sensorSchema);

// ENDPOINTS DE LA API

// POST - Crear nuevo registro
app.post('/api/temperatura', async (req, res) => {
    try {
        const { temperatura, humedad } = req.body;
        
        // Validar datos requeridos
        if (temperatura === undefined || humedad === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Temperatura y humedad son requeridos'
            });
        }

        const newData = new SensorData({ 
            temperatura: parseFloat(temperatura), 
            humedad: parseFloat(humedad) 
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

// GET - Obtener todos los registros
app.get('/api/temperatura', async (req, res) => {
    try {
        const { limit = 100, page = 1 } = req.query;
        
        const data = await SensorData.find()
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await SensorData.countDocuments();

        res.json({
            success: true,
            data: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos',
            error: error.message
        });
    }
});

// GET - Obtener un registro por ID
app.get('/api/temperatura/:id', async (req, res) => {
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
            message: 'Error al obtener el registro',
            error: error.message
        });
    }
});

// PUT - Actualizar un registro existente
app.put('/api/temperatura/:id', async (req, res) => {
    try {
        const { temperatura, humedad } = req.body;
        
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

// DELETE - Eliminar un registro
app.delete('/api/temperatura/:id', async (req, res) => {
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

// GET - Último registro
app.get('/api/temperatura/latest', async (req, res) => {
    try {
        const latestData = await SensorData.findOne()
            .sort({ timestamp: -1 });

        if (!latestData) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron registros'
            });
        }

        res.json({
            success: true,
            data: latestData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el último registro',
            error: error.message
        });
    }
});

// Ruta de información de la API
app.get('/', (req, res) => {
    res.json({
        message: 'API para sensor DHT11 con MongoDB Atlas',
        endpoints: {
            'POST - Crear registro': '/api/temperatura',
            'GET - Todos los registros': '/api/temperatura',
            'GET - Registro por ID': '/api/temperatura/:id',
            'PUT - Actualizar registro': '/api/temperatura/:id',
            'DELETE - Eliminar registro': '/api/temperatura/:id',
            'GET - Último registro': '/api/temperatura/latest'
        }
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});