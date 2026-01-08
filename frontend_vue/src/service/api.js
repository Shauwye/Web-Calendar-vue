import axios from 'axios';
import { useUserStore } from '@/stores/userStore';

const api = axios.create({
    baseURL: 'http://localhost:8081',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false
});

api.interceptors.request.use(config => {
    const userStore = useUserStore();
    if (userStore.jwtToken) {
        config.headers.Authorization = `Bearer ${userStore.jwtToken}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 403 || error.response?.status === 401) {
            const userStore = useUserStore();
            userStore.clearAuth();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default {
    login(credentials) {
        return api.post('/auth/login', credentials);
    },
    register(userData) {
        return api.post('/auth/register', userData);
    },
    getEvents() {
        return api.get('/event/mostrartodo');
    },
    createEvent(eventData) {
        return api.post('/event/crearconjson', eventData);
    },
    updateEvent(id, eventData) {
        return api.put(`/event/actualizar?id=${id}`, eventData);
    },
    deleteEvent(id) {
        return api.delete(`/event/eliminarporid/${id}`);
    },
    getEventsByUsername(username) {
        return api.get('/event/mostrartodo')
            .then(response => {
                const filteredEvents = response.data.filter(event =>
                    event.nombre === username
                );
                return {
                    ...response,
                    data: filteredEvents
                };
            })
            .catch(error => {
                console.error('Error fetching events:', error);
                throw error;
            });
    }
};