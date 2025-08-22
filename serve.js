const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Configuración de la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
const MONGODB_URI = 'mongodb+srv://admin:123@cluster0.7wbet4i.mongodb.net/DHT11?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((error) => console.error('❌ Error conectando a MongoDB:', error));

// Esquema y modelo de SensorData
const sensorDataSchema = new mongoose.Schema({
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
  fecha: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Endpoints

// GET - Obtener todos los datos del sensor
app.get('/api/sensordata', async (req, res) => {
  try {
    const data = await SensorData.find().sort({ fecha: -1 });
    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos',
      error: error.message
    });
  }
});

// GET - Obtener un dato específico por ID
app.get('/api/sensordata/:id', async (req, res) => {
  try {
    const data = await SensorData.findById(req.params.id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Dato no encontrado'
      });
    }
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el dato',
      error: error.message
    });
  }
});

// POST - Crear nuevo dato del sensor
app.post('/api/sensordata', async (req, res) => {
  try {
    const { temperatura, humedad } = req.body;

    // Validaciones
    if (temperatura === undefined || humedad === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Temperatura y humedad son requeridas'
      });
    }

    if (temperatura < -50 || temperatura > 100) {
      return res.status(400).json({
        success: false,
        message: 'Temperatura debe estar entre -50 y 100'
      });
    }

    if (humedad < 0 || humedad > 100) {
      return res.status(400).json({
        success: false,
        message: 'Humedad debe estar entre 0 y 100'
      });
    }

    const newData = new SensorData({
      temperatura,
      humedad
    });

    const savedData = await newData.save();
    
    res.status(201).json({
      success: true,
      message: 'Dato creado exitosamente',
      data: savedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear el dato',
      error: error.message
    });
  }
});

// PUT - Actualizar dato existente
app.put('/api/sensordata/:id', async (req, res) => {
  try {
    const { temperatura, humedad } = req.body;

    // Validaciones
    if (temperatura && (temperatura < -50 || temperatura > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Temperatura debe estar entre -50 y 100'
      });
    }

    if (humedad && (humedad < 0 || humedad > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Humedad debe estar entre 0 y 100'
      });
    }

    const updatedData = await SensorData.findByIdAndUpdate(
      req.params.id,
      { temperatura, humedad },
      { new: true, runValidators: true }
    );

    if (!updatedData) {
      return res.status(404).json({
        success: false,
        message: 'Dato no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dato actualizado exitosamente',
      data: updatedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el dato',
      error: error.message
    });
  }
});

// DELETE - Eliminar dato
app.delete('/api/sensordata/:id', async (req, res) => {
  try {
    const deletedData = await SensorData.findByIdAndDelete(req.params.id);
    
    if (!deletedData) {
      return res.status(404).json({
        success: false,
        message: 'Dato no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dato eliminado exitosamente',
      data: deletedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el dato',
      error: error.message
    });
  }
});

// DELETE - Eliminar todos los datos
app.delete('/api/sensordata', async (req, res) => {
  try {
    const result = await SensorData.deleteMany({});
    
    res.json({
      success: true,
      message: `Se eliminaron ${result.deletedCount} datos exitosamente`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar los datos',
      error: error.message
    });
  }
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'API del Sensor DHT11 funcionando',
    endpoints: {
      'GET /api/sensordata': 'Obtener todos los datos',
      'GET /api/sensordata/:id': 'Obtener un dato por ID',
      'POST /api/sensordata': 'Crear nuevo dato',
      'PUT /api/sensordata/:id': 'Actualizar dato',
      'DELETE /api/sensordata/:id': 'Eliminar dato específico',
      'DELETE /api/sensordata': 'Eliminar todos los datos'
    }
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log('📊 Endpoints disponibles:');
  console.log('  GET    /api/sensordata');
  console.log('  GET    /api/sensordata/:id');
  console.log('  POST   /api/sensordata');
  console.log('  PUT    /api/sensordata/:id');
  console.log('  DELETE /api/sensordata/:id');
  console.log('  DELETE /api/sensordata');
});