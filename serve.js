const express = require('express');
const bcrypt = require('bcryptjs');
const app = express();
const { 
  usuarios,
  dispositivos, 
  impactos, 
  botonesPanico, 
  rutas 
} = require('./connection');
app.use(express.json());
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
app.get('/system-check', async (req, res) => {
  try {
    const checks = {
      db: mongoose.connection.readyState === 1 ? 'OK' : 'OFFLINE',
      usuarios: await usuarios.countDocuments(),
      dispositivos: await dispositivos.countDocuments()
    };
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// 1. APIs DE USUARIO

// Ver todos los usuarios
app.get('/usuarios/ver-todos', async (req, res) => {
    try {
        const users = await usuarios.find({}, { contrasenia: 0 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Ver usuario por ID
app.get('/usuarios/ver/:id', async (req, res) => {
    try {
        const user = await usuarios.findById(req.params.id, { contrasenia: 0 });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar usuario' });
    }
});

// Crear usuario
app.post('/usuarios/crear', async (req, res) => {
    try {
        const { nombre, apellido, correo, contrasenia, tipo = 'usuario' } = req.body;
        
        if (await usuarios.findOne({ correo })) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const newUser = new usuarios({
            nombre,
            apellido,
            correo,
            contrasenia: await bcrypt.hash(contrasenia, 10),
            tipo
        });

        await newUser.save();
        const userData = newUser.toObject();
        delete userData.contrasenia;
        res.status(201).json(userData);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// Editar dispositivo por correo
app.patch('/usuarios/editar-dispositivo', async (req, res) => {
    try {
        const { correo, id_dispositivo } = req.body;
        const updatedUser = await usuarios.findOneAndUpdate(
            { correo },
            { id_dispositivo },
            { new: true, select: '-contrasenia' }
        );
        if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar dispositivo' });
    }
});

// Editar usuario completo
app.put('/usuarios/editar/:id', async (req, res) => {
    try {
        const updateData = req.body;
        if (updateData.contrasenia) {
            updateData.contrasenia = await bcrypt.hash(updateData.contrasenia, 10);
        }
        const updatedUser = await usuarios.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, select: '-contrasenia' }
        );
        if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// Editar contraseña
app.patch('/usuarios/editar-contrasenia', async (req, res) => {
    try {
        const { correo, contrasenia } = req.body;
        const updatedUser = await usuarios.findOneAndUpdate(
            { correo },
            { contrasenia: await bcrypt.hash(contrasenia, 10) },
            { new: true, select: '-contrasenia' }
        );
        if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar contraseña' });
    }
});

// Eliminar usuario por ID
app.delete('/usuarios/eliminar/:id', async (req, res) => {
    try {
        const deletedUser = await usuarios.findByIdAndDelete(req.params.id, { select: '-contrasenia' });
        if (!deletedUser) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(deletedUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// Eliminar usuario por correo
app.delete('/usuarios/eliminar-por-correo', async (req, res) => {
    try {
        const { correo } = req.body;
        const deletedUser = await usuarios.findOneAndDelete({ correo }, { select: '-contrasenia' });
        if (!deletedUser) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(deletedUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// 2. LOGIN BÁSICO
app.post('/usuarios/login', async (req, res) => {
    try {
        const { correo, contrasenia } = req.body;
        const user = await usuarios.findOne({ correo });
        
        if (!user || !(await bcrypt.compare(contrasenia, user.contrasenia))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        res.json({
            success: true,
            usuario: {
                id: user._id,
                nombre: user.nombre,
                apellido: user.apellido,
                correo: user.correo,
                tipo: user.tipo,
                id_dispositivo: user.id_dispositivo
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el login' });
    }
});
// 3. APIs DE DISPOSITIVOS

// Ver todos los dispositivos
app.get('/dispositivos/ver-todos', async (req, res) => {
    try {
        const listaDispositivos = await dispositivos.find(); // Cambiar nombre de variable
        res.json(listaDispositivos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener dispositivos', detalle: error.message });
    }
});
// Ver dispositivo por ID
app.get('/dispositivos/ver/:id', async (req, res) => {
    try {
        const dispositivoEncontrado = await dispositivos.findById(req.params.id);
        if (!dispositivoEncontrado) {
            return res.status(404).json({ 
                success: false,
                error: 'Dispositivo no encontrado' 
            });
        }
        
        // Obtener información adicional
        const impactosCount = await impactos.countDocuments({ 
            id_dispositivo: req.params.id 
        });
        const botonPanico = await botonesPanico.findOne({ 
            id_dispositivo: req.params.id 
        });
        
        res.json({
            success: true,
            data: {
                ...dispositivoEncontrado.toObject(),
                impactos: impactosCount,
                estado_boton: botonPanico ? botonPanico.estatus : 'no existe'
            }
        });
    } catch (error) {
        console.error('Error en GET /dispositivos/ver/:id:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al buscar dispositivo',
            message: error.message 
        });
    }
});

// Crear dispositivo
app.post('/dispositivos/crear', async (req, res) => {
    try {
        const nuevoDispositivo = new dispositivos({
            gps: { latitud: 0, longitud: 0 },
            fecha_de_actualizacion: new Date(),
            hora_de_actualizacion: "00:00:00",
            estatus: 'activo'
        });

        const dispositivoGuardado = await nuevoDispositivo.save();
        
        // Crear botón de pánico asociado
        const nuevoBoton = new botonesPanico({
            id_dispositivo: dispositivoGuardado._id,
            estatus: 'inactivo'
        });
        await nuevoBoton.save();

        res.status(201).json({
            success: true,
            data: dispositivoGuardado
        });
    } catch (error) {
        console.error('Error en POST /dispositivos/crear:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al crear dispositivo',
            message: error.message 
        });
    }
});

// Editar dispositivo completo
app.put('/dispositivos/editar/:id', async (req, res) => {
    try {
        const { gps, fecha_de_actualizacion, hora_de_actualizacion, estatus } = req.body;
        
        const dispositivoActualizado = await dispositivos.findByIdAndUpdate(
            req.params.id,
            {
                gps,
                fecha_de_actualizacion,
                hora_de_actualizacion,
                estatus
            },
            { new: true }
        );
        
        if (!dispositivoActualizado) {
            return res.status(404).json({ 
                success: false,
                error: 'Dispositivo no encontrado' 
            });
        }
        
        res.json({
            success: true,
            data: dispositivoActualizado
        });
    } catch (error) {
        console.error('Error en PUT /dispositivos/editar/:id:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al actualizar dispositivo',
            message: error.message 
        });
    }
});

// Eliminar dispositivo por ID
app.delete('/dispositivos/eliminar/:id', async (req, res) => {
    try {
        // Eliminar también el botón de pánico asociado
        await botonesPanico.findOneAndDelete({ 
            id_dispositivo: req.params.id 
        });
        
        const dispositivoEliminado = await dispositivos.findByIdAndDelete(req.params.id);
        if (!dispositivoEliminado) {
            return res.status(404).json({ 
                success: false,
                error: 'Dispositivo no encontrado' 
            });
        }
        
        res.json({
            success: true,
            data: dispositivoEliminado,
            message: 'Dispositivo eliminado correctamente'
        });
    } catch (error) {
        console.error('Error en DELETE /dispositivos/eliminar/:id:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al eliminar dispositivo',
            message: error.message 
        });
    }
});

// 4. APIs DE IMPACTOS

// Ver todos los impactos
app.get('/impactos/ver-todos', async (req, res) => {
    try {
        const allImpactos = await impactos.find();
        res.json(allImpactos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener impactos' });
    }
});

// Ver impactos por ID de dispositivo
app.get('/impactos/ver-dispositivo/:id_dispositivo', async (req, res) => {
    try {
        const impactosDispositivo = await impactos.find({ id_dispositivo: req.params.id_dispositivo });
        res.json(impactosDispositivo);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar impactos' });
    }
});

// Ver impacto por ID
app.get('/impactos/ver/:id', async (req, res) => {
    try {
        const impacto = await impactos.findById(req.params.id);
        if (!impacto) return res.status(404).json({ error: 'Impacto no encontrado' });
        res.json(impacto);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar impacto' });
    }
});

// Ver impactos mayores a 512
app.get('/impactos/ver-mayores', async (req, res) => {
    try {
        const impactosMayores = await impactos.find({ valor: { $gt: 512 } });
        res.json(impactosMayores);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar impactos' });
    }
});

// Crear impacto
app.post('/impactos/crear', async (req, res) => {
    try {
        const { id_dispositivo, valor, fecha_de_impacto = new Date() } = req.body;
        
        const newImpacto = new impactos({
            id_dispositivo,
            valor,
            fecha_de_impacto
        });

        await newImpacto.save();
        res.status(201).json(newImpacto);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear impacto' });
    }
});

// Editar impacto
app.put('/impactos/editar/:id', async (req, res) => {
    try {
        const updatedImpacto = await impactos.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!updatedImpacto) return res.status(404).json({ error: 'Impacto no encontrado' });
        res.json(updatedImpacto);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar impacto' });
    }
});

// Eliminar impacto por ID
app.delete('/impactos/eliminar/:id', async (req, res) => {
    try {
        const deletedImpacto = await impactos.findByIdAndDelete(req.params.id);
        if (!deletedImpacto) return res.status(404).json({ error: 'Impacto no encontrado' });
        res.json(deletedImpacto);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar impacto' });
    }
});

// 5. APIs DE BOTONES DE PÁNICO

// Ver estado del botón por ID de dispositivo
app.get('/boton-panico/ver/:id_dispositivo', async (req, res) => {
    try {
        const boton = await botonesPanico.findOne({ id_dispositivo: req.params.id_dispositivo });
        if (!boton) return res.status(404).json({ error: 'Botón de pánico no encontrado' });
        res.json(boton);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar botón de pánico' });
    }
});

// Crear botón de pánico
app.post('/boton-panico/crear', async (req, res) => {
    try {
        const { id_dispositivo, estatus = 'inactivo' } = req.body;
        
        const newBoton = new botonesPanico({
            id_dispositivo,
            estatus
        });

        await newBoton.save();
        res.status(201).json(newBoton);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear botón de pánico' });
    }
});

// Activación remota del botón
app.patch('/boton-panico/activar/:id_dispositivo', async (req, res) => {
    try {
        const updatedBoton = await botonesPanico.findOneAndUpdate(
            { id_dispositivo: req.params.id_dispositivo },
            { estatus: 'emergencia' },
            { new: true }
        );
        
        if (!updatedBoton) return res.status(404).json({ error: 'Botón de pánico no encontrado' });
        res.json(updatedBoton);
    } catch (error) {
        res.status(500).json({ error: 'Error al activar botón de pánico' });
    }
});

// Editar estatus del botón
app.patch('/boton-panico/editar/:id_dispositivo', async (req, res) => {
    try {
        const { estatus } = req.body;
        
        const updatedBoton = await botonesPanico.findOneAndUpdate(
            { id_dispositivo: req.params.id_dispositivo },
            { estatus },
            { new: true }
        );
        
        if (!updatedBoton) return res.status(404).json({ error: 'Botón de pánico no encontrado' });
        res.json(updatedBoton);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar botón de pánico' });
    }
});

// Eliminar botón de pánico por ID
app.delete('/boton-panico/eliminar/:id', async (req, res) => {
    try {
        const deletedBoton = await botonesPanico.findByIdAndDelete(req.params.id);
        if (!deletedBoton) return res.status(404).json({ error: 'Botón de pánico no encontrado' });
        res.json(deletedBoton);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar botón de pánico' });
    }
});

// 6. APIs DE RUTAS

// Ver todas las rutas
app.get('/rutas/ver-todos', async (req, res) => {
    try {
        const allRutas = await rutas.find();
        res.json(allRutas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener rutas' });
    }
});

// Ver rutas por ID de dispositivo
app.get('/rutas/ver-dispositivo/:id_dispositivo', async (req, res) => {
    try {
        const rutasDispositivo = await rutas.find({ id_dispositivo: req.params.id_dispositivo });
        res.json(rutasDispositivo);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar rutas' });
    }
});

// Ver rutas por nombre
app.get('/rutas/ver-nombre/:nombre', async (req, res) => {
    try {
        const rutasNombre = await rutas.find({ 
            nombre_ruta: { $regex: req.params.nombre, $options: 'i' } 
        });
        res.json(rutasNombre);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar rutas' });
    }
});

// Crear ruta (sin fecha final ni ubicación final)
app.post('/rutas/crear', async (req, res) => {
    try {
        const { id_dispositivo, nombre_ruta, ubicacion_de_inicio, fecha_de_inicio = new Date() } = req.body;
        
        const newRuta = new rutas({
            id_dispositivo,
            nombre_ruta,
            ubicacion_de_inicio,
            ubicacion_de_final: { latitud: 0, longitud: 0 },
            fecha_de_inicio,
            fecha_de_final: null
        });

        await newRuta.save();
        res.status(201).json(newRuta);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear ruta' });
    }
});

// Editar todos los datos de la ruta
app.put('/rutas/editar/:id', async (req, res) => {
    try {
        const updatedRuta = await rutas.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!updatedRuta) return res.status(404).json({ error: 'Ruta no encontrada' });
        res.json(updatedRuta);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar ruta' });
    }
});

// Editar final de ruta
app.patch('/rutas/finalizar/:id', async (req, res) => {
    try {
        const { ubicacion_de_final } = req.body;
        
        const updatedRuta = await rutas.findByIdAndUpdate(
            req.params.id,
            {
                ubicacion_de_final,
                fecha_de_final: new Date()
            },
            { new: true }
        );
        
        if (!updatedRuta) return res.status(404).json({ error: 'Ruta no encontrada' });
        res.json(updatedRuta);
    } catch (error) {
        res.status(500).json({ error: 'Error al finalizar ruta' });
    }
});

// Eliminar ruta por ID
app.delete('/rutas/eliminar/:id', async (req, res) => {
    try {
        const deletedRuta = await rutas.findByIdAndDelete(req.params.id);
        if (!deletedRuta) return res.status(404).json({ error: 'Ruta no encontrada' });
        res.json(deletedRuta);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar ruta' });
    }
});
// Endpoint para ver dispositivos - TEST
app.get('/dispositivos/test', async (req, res) => {
  try {
    const testDevices = await dispositivos.find().limit(5);
    res.json({ success: true, data: testDevices });
  } catch (error) {
    console.error('Error en test:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});