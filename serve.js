const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexión a MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://admin:123@cluster0.7wbet4i.mongodb.net/DHT11?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log(' Conectado a MongoDB Atlas');
  console.log(' Base de datos: DHT11');
  console.log(' Colección: data');
})
.catch(err => {
  console.error(' Error conectando a MongoDB:', err);
});

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
  collection: 'data'
});

// Índices para mejor performance
sensorDataSchema.index({ timestamp: -1 });
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

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
      'GET latest': '/api/sensor-data/latest/:deviceId?',
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
  console.log(` Server running on port ${PORT}`);
  console.log(` API available at: https://mybyke-api.onrender.com/api`);
  console.log(` Documentation: https://mybyke-api.onrender.com/`);
  console.log(` MongoDB Atlas: Cluster0.7wbet4i.mongodb.net/DHT11`);
  console.log(` Collection: data`);
});