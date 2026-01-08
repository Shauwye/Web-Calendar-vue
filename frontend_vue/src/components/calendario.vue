<template>
  <div class="calendar-layout">
    <Navbar />
    <div class="calendar-page">
      <div v-if="errorMessage && !showEmptyState" class="error-message">
        {{ errorMessage }}
        <Button label="Reintentar" @click="initializeCalendar" />
      </div>

      <!-- Estado para usuario sin eventos -->
      <div v-else-if="showEmptyState" class="empty-state">
        <div class="empty-content">
          <i class="pi pi-calendar-plus empty-icon"></i>
          <h3>No tienes eventos aún</h3>
          <p>¡Comienza creando tu primer evento!</p>
          <Button
              label="Crear Evento"
              icon="pi pi-plus"
              @click="goToCreateEvent"
              class="create-event-btn"
          />
        </div>
        <!-- Mostrar calendario vacío -->
        <div class="calendar-container">
          <ScheduleXCalendar
              v-if="calendarApp"
              :calendar-app="calendarApp"
          />
        </div>
      </div>

      <ScheduleXCalendar
          v-else-if="calendarApp && !showEmptyState"
          :calendar-app="calendarApp"
      />

      <div v-else class="loading-container">
        <ProgressSpinner />
        <p>Cargando eventos...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Componente de vista principal del calendario del usuario.
 * Muestra eventos en ScheduleXCalendar, gestiona errores y estados vacíos.
 *
 * @component
 */

import { shallowRef, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ScheduleXCalendar } from '@schedule-x/vue'
import {
  createCalendar,
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar'
import '@schedule-x/theme-default/dist/index.css'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import Navbar from "@/components/navbar.vue"
import { useUserStore } from '@/stores/userStore'
import api from '@/service/api'
import forge from 'node-forge'

/** @constant {Object} router - Router de Vue para navegación */
const router = useRouter()

/** @constant {Object} userStore - Store con datos del usuario actual */
const userStore = useUserStore()

/** @constant {Ref<Object>} calendarApp - Referencia reactiva al objeto del calendario */
const calendarApp = shallowRef(null)

/** @constant {Ref<boolean>} isLoading - Indica si los eventos están siendo cargados */
const isLoading = ref(true)

/** @constant {Ref<string|null>} errorMessage - Mensaje de error si falla la carga */
const errorMessage = ref(null)

/** @constant {Ref<boolean>} showEmptyState - Indica si se debe mostrar el estado vacío */
const showEmptyState = ref(false)

/**
 * Desencripta un texto cifrado con AES-GCM.
 *
 * @param {string} encryptedData - Texto cifrado
 * @returns {string} Texto desencriptado
 */
const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return '';
    const key = 'llavede16carater';
    const iv = 'programacioncomp';

    const encryptedBytes = forge.util.decode64(encryptedData);
    const tagLength = 16;
    const tag = encryptedBytes.slice(-tagLength);
    const ciphertext = encryptedBytes.slice(0, -tagLength);

    const cipher = forge.cipher.createDecipher('AES-GCM', forge.util.createBuffer(key));
    cipher.start({
      iv: forge.util.createBuffer(iv),
      tag: forge.util.createBuffer(tag)
    });

    cipher.update(forge.util.createBuffer(ciphertext));
    const result = cipher.finish();

    if (!result) {
      console.error('Falló la autenticación al desencriptar');
      return encryptedData;
    }

    return cipher.output.toString();
  } catch (error) {
    console.error('Error al desencriptar:', error);
    return encryptedData;
  }
};

/**
 * Formatea una hora (HH:mm:ss) al formato HH:mm.
 *
 * @param {string} timeString - Hora en formato HH:mm:ss
 * @returns {string} Hora en formato HH:mm
 */
const formatTimeForScheduleX = (timeString) => {
  if (!timeString) return '';
  return timeString.split(':').slice(0, 2).join(':');
};

/**
 * Extrae solo la fecha (YYYY-MM-DD) de una cadena ISO.
 *
 * @param {string} dateString - Fecha ISO
 * @returns {string} Fecha formateada
 */
const formatDateForScheduleX = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

/**
 * Formatea una lista de eventos crudos en el formato requerido por ScheduleXCalendar.
 *
 * @param {Array<Object>} events - Lista de eventos desde la API
 * @returns {Array<Object>} Eventos formateados
 */
const formatEventsForCalendar = (events) => {
  if (!events || events.length === 0) return [];

  return events.map(event => {
    const decryptedTitle = decryptData(event.title);
    const decryptedDescription = decryptData(event.description);
    const decryptedColor = decryptData(event.color) || '#4361ee';

    const startDate = formatDateForScheduleX(event.startDate);
    const endDate = formatDateForScheduleX(event.endDate);
    const startTime = formatTimeForScheduleX(event.startTime);
    const endTime = formatTimeForScheduleX(event.endTime);

    return {
      id: event.id,
      title: decryptedTitle,
      start: `${startDate}${startTime ? ' ' + startTime : ''}`,
      end: `${endDate}${endTime ? ' ' + endTime : ''}`,
      description: decryptedDescription,
      calendarId: 'personal',
      color: decryptedColor
    };
  });
};

/**
 * Redirige al usuario a la vista de creación de evento.
 */
const goToCreateEvent = () => {
  router.push({ name: 'crearEvento' });
};

/**
 * Inicializa el calendario con los eventos del usuario.
 * Maneja errores, estado vacío y carga.
 *
 * @async
 */
const initializeCalendar = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = null;
    showEmptyState.value = false;

    if (!userStore.username) {
      throw new Error('No se pudo identificar al usuario');
    }

    const response = await api.getEventsByUsername(userStore.username);
    let formattedEvents = [];

    if (response.data && response.data.length > 0) {
      formattedEvents = formatEventsForCalendar(response.data);
    } else {
      showEmptyState.value = true;
    }

    calendarApp.value = createCalendar({
      selectedDate: new Date().toISOString().split('T')[0],
      locale: 'es-ES',
      views: [
        createViewDay(),
        createViewWeek(),
        createViewMonthGrid(),
        createViewMonthAgenda(),
      ],
      defaultView: 'week',
      events: formattedEvents,
      calendars: {
        personal: {
          colorName: 'Personal',
          lightColors: {
            main: '#4361ee',
            container: '#e0e7ff',
            onContainer: '#3730a3'
          }
        }
      }
    });

  } catch (error) {
    console.error('Error al cargar eventos:', error);
    errorMessage.value = 'Error al cargar los eventos. ' +
        (error.response?.data?.message || error.message || 'Intente nuevamente más tarde.');
    showEmptyState.value = false;
  } finally {
    isLoading.value = false;
  }
};

/**
 * Hook que inicializa el calendario al montar el componente.
 */
onMounted(() => {
  initializeCalendar();
});

</script>

<style>
.calendar-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
}

.calendar-page {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  box-sizing: border-box;
  flex-grow: 1;
  background-color: #f6f8fa;
}

.sx-vue-calendar-wrapper {
  width: 100%;
  max-width: 1200px;
  height: 800px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background-color: #fff;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  width: 100%;
  gap: 1rem;
}

.error-message {
  background-color: #fff5f5;
  color: #cc0000;
  padding: 1.5rem;
  border-radius: 8px;
  max-width: 600px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1200px;
}

.empty-content {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  text-align: center;
  margin-bottom: 2rem;
  max-width: 400px;
}

.empty-icon {
  font-size: 4rem;
  color: #6c757d;
  margin-bottom: 1rem;
}

.empty-content h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.empty-content p {
  color: #6c757d;
  margin-bottom: 2rem;
  font-size: 1rem;
}

.create-event-btn {
  background: linear-gradient(to right, #4361ee, #6a11cb);
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
}

.calendar-container {
  width: 100%;
  height: 600px;
}

.calendar-container .sx-vue-calendar-wrapper {
  height: 100%;
}

/* Estilos personalizados para eventos con colores específicos */
.sx-vue-calendar-wrapper .sx-calendar-event {
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .calendar-page {
    padding: 1rem;
  }

  .sx-vue-calendar-wrapper,
  .calendar-container {
    height: 600px;
  }

  .empty-content {
    padding: 2rem;
    margin: 1rem;
  }

  .empty-icon {
    font-size: 3rem;
  }

  .empty-content h3 {
    font-size: 1.25rem;
  }
}
</style>