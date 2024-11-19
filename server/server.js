const express = require('express');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

// Ruta de inicio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Ruta para redirigir al usuario a Unsplash para autenticación
app.get('/login', (req, res) => {
    const authorizationUrl = `https://unsplash.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&response_type=code&scope=public`;
    res.redirect(authorizationUrl);
});
 
// Ruta de callback para recibir el código de autorización
app.get('/callback', async (req, res) => {
    const authorizationCode = req.query.code;

    try {
        const response = await axios.post('https://unsplash.com/oauth/token', {
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            code: authorizationCode,
            grant_type: 'authorization_code',
        });

        const accessToken = response.data.access_token;
        console.log('Token de acceso recibido:', accessToken);

        // Redirige al usuario a una nueva página con el token de acceso como parámetro
        res.redirect(`/dashboard/dashboard.html?access_token=${accessToken}`);

    } catch (error) {
        console.error('Error al obtener el token:', error.response ? error.response.data : error.message);
        res.status(500).send('Error al obtener el token');
    }
});

// Ruta para obtener las fotos desde Unsplash
app.get('/photos', async (req, res) => {
    const query = req.query.query || ''; // Búsqueda o general
    const perPage = 30; // Número fijo de fotos por solicitud
    const page = req.query.page || 1; // Página predeterminada es 1

    try {
        // Construir la URL de acuerdo a si es una búsqueda o no
        const url = query 
            ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${process.env.CLIENT_ID}&page=${page}&per_page=${perPage}` // Para búsquedas
            : `https://api.unsplash.com/photos?client_id=${process.env.CLIENT_ID}&page=${page}&per_page=${perPage}`; // General

        // Hacer la solicitud a Unsplash
        const response = await axios.get(url);

        // Extraer las fotos del resultado
        const photos = query ? response.data.results : response.data;

        // Enviar las fotos al cliente
        res.json(photos);
    } catch (error) {
        console.error('Error al obtener fotos:', error.response ? error.response.data : error.message);
        res.status(500).send('Error al obtener fotos');
    }
});


// Ruta para obtener fotos favoritas desde el almacenamiento
app.get('/favorite-photos', async (req, res) => {
    const favoritePhotoIds = JSON.parse(req.query.favoritePhotos || '[]');

    if (favoritePhotoIds.length === 0) {
        return res.json([]); // No hay fotos favoritas
    }

    try {
        // Hacer solicitudes a Unsplash para obtener las fotos por sus IDs
        const photoPromises = favoritePhotoIds.map(photoId =>
            axios.get(`https://api.unsplash.com/photos/${photoId}?client_id=${process.env.CLIENT_ID}`)
        );

        const photoResponses = await Promise.all(photoPromises);
        const photos = photoResponses.map(response => response.data);

        res.json(photos); // Devuelve las fotos favoritas
    } catch (error) {
        console.error('Error al obtener fotos favoritas:', error);
        res.status(500).send('Error al obtener fotos favoritas');
    }
});

app.get('/search', async (req, res) => {
    const query = req.query.query || '';  // Obtener la consulta o dejarla vacía
    const perPage = 30;  // Número de resultados por página
    const page = req.query.page || 1; // Página por defecto

    try {
        // Construir la URL de búsqueda con los parámetros
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${process.env.CLIENT_ID}&per_page=${perPage}&page=${page}`;

        // Realizar la solicitud a Unsplash
        const response = await axios.get(url);

        // Obtener las fotos de los resultados
        const photos = response.data.results;

        // Enviar las fotos al frontend
        res.json(photos);
    } catch (error) {
        console.error('Error al buscar fotos:', error.response ? error.response.data : error.message);
        res.status(500).send('Error al realizar la búsqueda');
    }
});

app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});


