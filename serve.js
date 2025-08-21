const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB, SensorData } = require('./connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ENDPOINTS

// POST - Crear nuevo dato del sensor
app.post('/api/sensor-data', async (req, res) => {
    try {
        const { temperature, humidity, deviceId, location } = req.body;
        
        if (temperature === undefined || humidity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Temperature and humidity are required'
            });
        }

        const sensorData = new SensorData({
            temperature: parseFloat(temperature),
            humidity: parseFloat(humidity),
            deviceId: deviceId || 'ESP32_DHT11',
            location: location || 'Unknown'
        });

        const savedData = await sensorData.save();
        
        res.status(201).json({
            success: true,
            message: 'Data saved successfully in DHT11 database',
            data: savedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving sensor data',
            error: error.message
        });
    }
});

// GET - Obtener todos los datos
app.get('/api/sensor-data', async (req, res) => {
    try {
        const { limit = 100, page = 1, deviceId } = req.query;
        const query = deviceId ? { deviceId } : {};
        
        const data = await SensorData.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await SensorData.countDocuments(query);

        res.json({
            success: true,
            database: 'DHT11',
            collection: 'data',
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
            message: 'Error retrieving data',
            error: error.message
        });
    }
});

// GET - Obtener dato por ID
app.get('/api/sensor-data/:id', async (req, res) => {
    try {
        const data = await SensorData.findById(req.params.id);
        
        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Data not found'
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving data',
            error: error.message
        });
    }
});

// PUT - Actualizar dato existente
app.put('/api/sensor-data/:id', async (req, res) => {
    try {
        const { temperature, humidity, location } = req.body;
        
        const updateData = {};
        if (temperature !== undefined) updateData.temperature = parseFloat(temperature);
        if (humidity !== undefined) updateData.humidity = parseFloat(humidity);
        if (location !== undefined) updateData.location = location;

        const updatedData = await SensorData.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedData) {
            return res.status(404).json({
                success: false,
                message: 'Data not found'
            });
        }

        res.json({
            success: true,
            message: 'Data updated successfully',
            data: updatedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating data',
            error: error.message
        });
    }
});

// DELETE - Eliminar dato
app.delete('/api/sensor-data/:id', async (req, res) => {
    try {
        const deletedData = await SensorData.findByIdAndDelete(req.params.id);
        
        if (!deletedData) {
            return res.status(404).json({
                success: false,
                message: 'Data not found'
            });
        }

        res.json({
            success: true,
            message: 'Data deleted successfully',
            data: deletedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting data',
            error: error.message
        });
    }
});

// GET - Último dato del sensor
app.get('/api/sensor-data/latest/:deviceId?', async (req, res) => {
    try {
        const deviceId = req.params.deviceId || 'ESP32_DHT11';
        
        const latestData = await SensorData.findOne({ deviceId })
            .sort({ timestamp: -1 });

        if (!latestData) {
            return res.status(404).json({
                success: false,
                message: 'No data found for device'
            });
        }

        res.json({
            success: true,
            data: latestData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving latest data',
            error: error.message
        });
    }
});

// GET - Estadísticas de datos
app.get('/api/sensor-data/stats/:deviceId?', async (req, res) => {
    try {
        const deviceId = req.params.deviceId || 'ESP32_DHT11';
        const query = { deviceId };
        
        const stats = await SensorData.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    avgTemperature: { $avg: "$temperature" },
                    maxTemperature: { $max: "$temperature" },
                    minTemperature: { $min: "$temperature" },
                    avgHumidity: { $avg: "$humidity" },
                    maxHumidity: { $max: "$humidity" },
                    minHumidity: { $min: "$humidity" },
                    totalReadings: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            deviceId: deviceId,
            statistics: stats.length > 0 ? stats[0] : {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving statistics',
            error: error.message
        });
    }
});

// GET - Health check de la base de datos
app.get('/api/health', async (req, res) => {
    try {
        // Verificar conexión a la base de datos
        const dbState = mongoose.connection.readyState;
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        
        const count = await SensorData.countDocuments();
        
        res.json({
            success: true,
            database: {
                name: 'DHT11',
                collection: 'data',
                state: states[dbState],
                totalDocuments: count,
                connection: 'MongoDB Atlas Cluster0'
            },
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database health check failed',
            error: error.message
        });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: 'DHT11 Sensor API with MongoDB Atlas',
        database: 'DHT11',
        collection: 'data',
        connection: 'Cluster0.7wbet4i.mongodb.net',
        endpoints: {
            'POST data': '/api/sensor-data',
            'GET all data': '/api/sensor-data',
            'GET by ID': '/api/sensor-data/:id',
            'UPDATE data': '/api/sensor-data/:id',
            'DELETE data': '/api/sensor-data/:id',
            'GET latest': '/api/sensor-data/latest/:deviceId?',
            'GET stats': '/api/sensor-data/stats/:deviceId?',
            'Health check': '/api/health'
        }
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});