<template>
  <Navbar />
  <div class="page-layout">
    <div class="create-page">
      <div class="create-container">
        <h2>Crear Nuevo Evento</h2>
        <form class="create-form" @submit.prevent="saveEvent">
          <div class="form-group">
            <label for="title">Título del Evento*</label>
            <InputText id="title" v-model="eventData.title" :class="{'p-invalid': validationErrors.title}" />
            <small v-if="validationErrors.title" class="p-error">{{ validationErrors.title }}</small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Inicio*</label>
              <Calendar v-model="eventData.startDate" dateFormat="yy-mm-dd" showIcon
                        :class="{'p-invalid': validationErrors.startDate}" />
              <small v-if="validationErrors.startDate" class="p-error">{{ validationErrors.startDate }}</small>
            </div>
            <div class="form-group">
              <label>Hora de Inicio*</label>
              <Calendar v-model="eventData.startTime" timeOnly hourFormat="24"
                        :class="{'p-invalid': validationErrors.startTime}" />
              <small v-if="validationErrors.startTime" class="p-error">{{ validationErrors.startTime }}</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Fin*</label>
              <Calendar v-model="eventData.endDate" dateFormat="yy-mm-dd" showIcon
                        :class="{'p-invalid': validationErrors.endDate}" />
              <small v-if="validationErrors.endDate" class="p-error">{{ validationErrors.endDate }}</small>
            </div>
            <div class="form-group">
              <label>Hora de Fin*</label>
              <Calendar v-model="eventData.endTime" timeOnly hourFormat="24"
                        :class="{'p-invalid': validationErrors.endTime}" />
              <small v-if="validationErrors.endTime" class="p-error">{{ validationErrors.endTime }}</small>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Descripción (Opcional)</label>
            <Textarea id="description" v-model="eventData.description" rows="3" />
          </div>

          <div class="form-group">
            <label for="color">Color del Evento</label>
            <ColorPicker v-model="eventData.color" format="hex" />
          </div>

          <div class="form-group">
            <label for="invitedUsers">Invitar Usuarios (Opcional)</label>
            <Chips id="invitedUsers" v-model="invitedUsers" separator="," placeholder="usuario@ejemplo.com" />
            <small class="p-text-secondary">Los usuarios invitados recibirán una notificación por correo</small>
          </div>

          <div class="form-group">
            <label for="attachments">Archivos Adjuntos (Opcional)</label>
            <FileUpload name="attachments[]"
                        @upload="handleFileUpload"
                        :multiple="true"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        :maxFileSize="1000000"
                        chooseLabel="Seleccionar archivos"
                        class="file-upload" />
            <small>Formatos permitidos: imágenes, PDF, Word, Excel, PowerPoint, TXT (max 1MB)</small>
            <div v-if="eventData.attachedFiles.length > 0" class="file-preview">
              <div v-for="(file, index) in eventData.attachedFiles" :key="index" class="file-item">
                <span>{{ file.name }}</span>
                <Button icon="pi pi-times" class="p-button-rounded p-button-text p-button-danger remove-file-btn"
                        @click="removeFile(index)" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <small class="p-text-secondary">* Campos obligatorios</small>
          </div>

          <div class="form-group actions">
            <Button label="Cancelar" severity="secondary" @click="$router.back()" />
            <Button type="submit" label="Guardar Evento" :loading="isSaving" />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @file Componente para la creación de nuevos eventos.
 * Permite ingresar título, fechas, horas, descripción, color, invitados, y archivos adjuntos.
 * Utiliza PrimeVue para los elementos UI.
 * Envía invitaciones por correo al crear el evento.
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import api from '@/service/api'
import { sendEventInvitationEmail } from '@/service/emailService'

import InputText from 'primevue/inputtext'
import Calendar from 'primevue/calendar'
import Textarea from 'primevue/textarea'
import ColorPicker from 'primevue/colorpicker'
import Chips from 'primevue/chips'
import FileUpload from 'primevue/fileupload'
import Button from 'primevue/button'
import Navbar from "@/components/navbar.vue"

// Router y estado global
const router = useRouter()
const userStore = useUserStore()

/**
 * @constant {Object} eventData - Objeto reactivo con los datos del evento.
 */
const eventData = ref({
  title: '',
  startDate: null,
  startTime: null,
  endDate: null,
  endTime: null,
  description: '',
  color: '#4361ee',
  nombre: userStore.username,
  invitedUserEmail: [],
  attachedFiles: []
})

/**
 * @constant {Array} invitedUsers - Correos electrónicos de usuarios invitados.
 */
const invitedUsers = ref([])

/**
 * @constant {Object} validationErrors - Almacena errores de validación de formulario.
 */
const validationErrors = ref({})

/**
 * @constant {Boolean} isSaving - Indica si el evento se está guardando.
 */
const isSaving = ref(false)

/**
 * @function handleFileUpload
 * @description Convierte archivos subidos a base64 y los almacena en `eventData.attachedFiles`.
 * @param {Object} event - Evento de subida de archivo.
 */
const handleFileUpload = (event) => {
  const files = event.files
  const promises = files.map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target.result.split(',')[1]
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          content: base64String
        })
      }
      reader.readAsDataURL(file)
    })
  })

  Promise.all(promises).then(fileData => {
    eventData.value.attachedFiles = [...eventData.value.attachedFiles, ...fileData]
  })
}

/**
 * @function removeFile
 * @description Elimina un archivo adjunto del arreglo `eventData.attachedFiles`.
 * @param {number} index - Índice del archivo a eliminar.
 */
const removeFile = (index) => {
  eventData.value.attachedFiles.splice(index, 1)
}

/**
 * @function validateForm
 * @description Valida los campos requeridos del formulario.
 * @returns {boolean} true si no hay errores, false si los hay.
 */
const validateForm = () => {
  const errors = {}

  if (!eventData.value.title.trim()) {
    errors.title = 'El título es obligatorio'
  }

  if (!eventData.value.startDate) {
    errors.startDate = 'La fecha de inicio es obligatoria'
  }

  if (!eventData.value.startTime) {
    errors.startTime = 'La hora de inicio es obligatoria'
  }

  if (!eventData.value.endDate) {
    errors.endDate = 'La fecha de fin es obligatoria'
  }

  if (!eventData.value.endTime) {
    errors.endTime = 'La hora de fin es obligatoria'
  }

  if (eventData.value.startDate && eventData.value.endDate &&
      eventData.value.startTime && eventData.value.endTime) {
    const startDateTime = new Date(
        eventData.value.startDate.getFullYear(),
        eventData.value.startDate.getMonth(),
        eventData.value.startDate.getDate(),
        eventData.value.startTime.getHours(),
        eventData.value.startTime.getMinutes()
    )

    const endDateTime = new Date(
        eventData.value.endDate.getFullYear(),
        eventData.value.endDate.getMonth(),
        eventData.value.endDate.getDate(),
        eventData.value.endTime.getHours(),
        eventData.value.endTime.getMinutes()
    )

    if (endDateTime <= startDateTime) {
      errors.endTime = 'La hora de fin debe ser posterior a la hora de inicio'
    }
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

/**
 * @function formatTime
 * @description Convierte un objeto Date a string con formato `HH:mm:00`.
 * @param {Date} date - Objeto Date.
 * @returns {string|null} Hora formateada.
 */
const formatTime = (date) => {
  if (!date) return null
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}:00`
}

/**
 * @function sendInvitations
 * @description Envía correos electrónicos de invitación a los usuarios.
 * @param {string} eventTitle - Título del evento.
 * @param {Array} invitedEmails - Lista de correos electrónicos.
 */
const sendInvitations = async (eventTitle, invitedEmails) => {
  try {
    for (const email of invitedEmails) {
      await sendEventInvitationEmail(
          email,
          eventTitle,
          eventData.value.startDate.toISOString().split('T')[0],
          formatTime(eventData.value.startTime),
          userStore.username
      )
    }
  } catch (error) {
    console.error('Error enviando invitaciones:', error)
  }
}

/**
 * @function saveEvent
 * @description Valida y guarda el evento, luego redirige al calendario.
 */
const saveEvent = async () => {
  if (!validateForm()) {
    return
  }

  try {
    isSaving.value = true

    const eventToSend = {
      title: eventData.value.title,
      description: eventData.value.description,
      color: eventData.value.color,
      nombre: eventData.value.nombre,
      invitedUserEmail: invitedUsers.value,
      attachedFiles: eventData.value.attachedFiles,
      startDate: eventData.value.startDate.toISOString().split('T')[0],
      startTime: formatTime(eventData.value.startTime),
      endDate: eventData.value.endDate.toISOString().split('T')[0],
      endTime: formatTime(eventData.value.endTime)
    }

    const response = await api.createEvent(eventToSend)
    if (response.status === 201) {
      if (invitedUsers.value.length > 0) {
        await sendInvitations(eventData.value.title, invitedUsers.value)
      }

      alert('Evento creado con éxito')
      router.push('/calendario')
    }
  } catch (error) {
    console.error('Error al crear el evento:', error)

    if (error.response?.data) {
      alert(`Error al crear el evento: ${error.response.data}`)
    } else {
      alert('Error al crear el evento. Por favor verifica los datos e intenta nuevamente.')
    }
  } finally {
    isSaving.value = false
  }
}
</script>


<style scoped>
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.create-page {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 2rem;
  background-color: #f8f9fa;
}

.create-container {
  width: 100%;
  max-width: 700px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 2rem;
}

h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  text-align: center;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.file-upload {
  width: 100%;
}

.file-preview {
  margin-top: 0.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.remove-file-btn {
  margin-left: 0.5rem;
}

small {
  color: #6c757d;
  font-size: 0.875rem;
}

.p-error {
  color: #f44336;
  font-size: 0.875rem;
}

.p-invalid {
  border-color: #f44336 !important;
}

.p-text-secondary {
  color: #6c757d;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 1.5rem;
  }

  .create-container {
    padding: 1.5rem;
  }
}
</style>