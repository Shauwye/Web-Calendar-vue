<template>
  <div class="page-layout">
    <Navbar />
    <div class="create-page">
      <div class="create-container">
        <h2>Editar Evento</h2>
        <form class="create-form" @submit.prevent="updateEvent">

          <div class="form-group">
            <label for="title">Título del Evento*</label>
            <InputText id="title" v-model="eventData.title" required :class="{'p-invalid': validationErrors.title}" />
            <small v-if="validationErrors.title" class="p-error">{{ validationErrors.title }}</small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Inicio*</label>
              <Calendar v-model="eventData.startDate" dateFormat="yy-mm-dd" showIcon required
                        :class="{'p-invalid': validationErrors.startDate}" />
              <small v-if="validationErrors.startDate" class="p-error">{{ validationErrors.startDate }}</small>
            </div>
            <div class="form-group" v-if="!eventData.allDay">
              <label>Hora de Inicio*</label>
              <Calendar v-model="eventData.startTime" timeOnly hourFormat="24"
                        :class="{'p-invalid': validationErrors.startTime}" />
              <small v-if="validationErrors.startTime" class="p-error">{{ validationErrors.startTime }}</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Fin*</label>
              <Calendar v-model="eventData.endDate" dateFormat="yy-mm-dd" showIcon required
                        :class="{'p-invalid': validationErrors.endDate}" />
              <small v-if="validationErrors.endDate" class="p-error">{{ validationErrors.endDate }}</small>
            </div>
            <div class="form-group" v-if="!eventData.allDay">
              <label>Hora de Fin*</label>
              <Calendar v-model="eventData.endTime" timeOnly hourFormat="24"
                        :class="{'p-invalid': validationErrors.endTime}" />
              <small v-if="validationErrors.endTime" class="p-error">{{ validationErrors.endTime }}</small>
            </div>
          </div>

          <div class="form-group checkbox-group">
            <Checkbox v-model="eventData.allDay" inputId="allDay" :binary="true" />
            <label for="allDay">Todo el día</label>
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
            <label for="invitedUsers">Invitar Usuarios</label>
            <Chips id="invitedUsers" v-model="invitedUsers" separator="," placeholder="usuario@ejemplo.com" />
            <small class="p-text-secondary">Los usuarios invitados recibirán una notificación por correo</small>
          </div>

          <div class="form-actions">
            <Button label="Cancelar" severity="secondary" @click="goBack" />
            <Button label="Guardar Cambios" type="submit" :loading="loading" />
            <Button label="Eliminar Evento" severity="danger" @click="confirmDeleteEvent" />
          </div>
        </form>
      </div>
    </div>

    <Toast />
  </div>
</template>

<script setup>
/**
 * @file EditarEvento.vue
 * @description Componente para editar un evento existente en el sistema. Permite modificar detalles como título,
 * fechas, horas, descripción, color e invitados. También proporciona funcionalidades para actualizar o eliminar el evento.
 * @module components/EditarEvento
 */

/// Imports de librerías y componentes externos
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Calendar from 'primevue/calendar'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import ColorPicker from 'primevue/colorpicker'
import Chips from 'primevue/chips'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import Navbar from '@/components/navbar.vue'
import api from '@/service/api'
import forge from 'node-forge'
import { useUserStore } from '@/stores/userStore'
import { sendEventInvitationEmail } from '@/service/emailService'

/// Variables y estados reactivos
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

/**
 * Datos del evento a editar.
 * @type {import('vue').Ref<Object>}
 */
const eventData = ref({
  id: null,
  title: '',
  startDate: null,
  startTime: null,
  endDate: null,
  endTime: null,
  allDay: false,
  description: '',
  color: '#4361ee'
})

/**
 * Lista de correos de usuarios invitados.
 * @type {import('vue').Ref<Array<string>>}
 */
const invitedUsers = ref([])

/**
 * Lista original de invitados (para detectar nuevos).
 * @type {import('vue').Ref<Array<string>>}
 */
const originalInvitedUsers = ref([])

/// Control de carga y validación
const loading = ref(false)
const validationErrors = ref({})
const originalEvent = ref(null)

/**
 * Desencripta los datos encriptados del evento.
 * @param {string} encryptedData - Cadena de texto encriptada.
 * @returns {string} - Texto desencriptado o el original si falla.
 */
const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return ''
    const key = 'llavede16carater'
    const iv = 'programacioncomp'
    const encryptedBytes = forge.util.decode64(encryptedData)
    const tagLength = 16
    const tag = encryptedBytes.slice(-tagLength)
    const ciphertext = encryptedBytes.slice(0, -tagLength)
    const cipher = forge.cipher.createDecipher('AES-GCM', forge.util.createBuffer(key))
    cipher.start({ iv: forge.util.createBuffer(iv), tag: forge.util.createBuffer(tag) })
    cipher.update(forge.util.createBuffer(ciphertext))
    return cipher.finish() ? cipher.output.toString() : encryptedData
  } catch {
    return encryptedData
  }
}

/**
 * Valida el formulario de edición.
 * @returns {boolean} true si el formulario es válido, false en caso contrario.
 */
const validateForm = () => {
  validationErrors.value = {}
  let isValid = true

  if (!eventData.value.title.trim()) {
    validationErrors.value.title = 'El título es obligatorio'
    isValid = false
  }

  if (!eventData.value.startDate) {
    validationErrors.value.startDate = 'La fecha de inicio es obligatoria'
    isValid = false
  }

  if (!eventData.value.startTime && !eventData.value.allDay) {
    validationErrors.value.startTime = 'La hora de inicio es obligatoria'
    isValid = false
  }

  if (!eventData.value.endDate) {
    validationErrors.value.endDate = 'La fecha de fin es obligatoria'
    isValid = false
  }

  if (!eventData.value.endTime && !eventData.value.allDay) {
    validationErrors.value.endTime = 'La hora de fin es obligatoria'
    isValid = false
  }

  if (eventData.value.startDate && eventData.value.endDate) {
    const start = new Date(eventData.value.startDate)
    const end = new Date(eventData.value.endDate)
    if (end < start) {
      validationErrors.value.endDate = 'La fecha de fin debe ser posterior a la de inicio'
      isValid = false
    }
  }

  return isValid
}

/**
 * Redirige a la pantalla de gestión de eventos.
 */
const goBack = () => {
  router.push({ name: 'gestionarEventos' })
}

/**
 * Envía los datos del evento actualizado al servidor.
 */
const updateEvent = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    if (!userStore.isAuthenticated()) throw new Error('La sesión ha expirado')

    const formatTime = (date) => {
      if (!date) return null
      const d = new Date(date)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`
    }

    const payload = {
      id: eventData.value.id,
      title: eventData.value.title,
      startDate: eventData.value.startDate,
      startTime: eventData.value.allDay ? null : formatTime(eventData.value.startTime),
      endDate: eventData.value.endDate,
      endTime: eventData.value.allDay ? null : formatTime(eventData.value.endTime),
      allDay: eventData.value.allDay,
      description: eventData.value.description || '',
      color: eventData.value.color || '#4361ee',
      nombre: userStore.username
    }

    if (originalEvent.value?.attachedFiles?.length) {
      payload.attachedFiles = originalEvent.value.attachedFiles
    }

    payload.invitedUserEmail = invitedUsers.value.length ? invitedUsers.value : originalInvitedUsers.value

    const response = await api.updateEvent(eventData.value.id, payload)

    if (response.status === 200 || response.status === 201) {
      const newInvitees = invitedUsers.value.filter(email => !originalInvitedUsers.value.includes(email))
      for (const email of newInvitees) {
        try {
          await sendEventInvitationEmail(
              email,
              eventData.value.title,
              eventData.value.startDate,
              eventData.value.endDate,
              userStore.username
          )
        } catch (err) {
          console.error('Error:', err)
          toast.add({ severity: 'warn', summary: 'Aviso', detail: `Invitación no enviada a ${email}`, life: 3000 })
        }
      }

      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Evento actualizado correctamente', life: 3000 })
      router.push({ name: 'gestionarEventos' })
    }
  } catch (error) {
    console.error('Error al actualizar:', error)
    if (error.response?.status === 403 || error.message.includes('sesión')) {
      toast.add({ severity: 'error', summary: 'Sesión expirada', detail: 'Por favor inicie sesión nuevamente', life: 4000 })
      userStore.clearAuth()
      router.push('/login')
    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.message || error.message, life: 4000 })
    }
  } finally {
    loading.value = false
  }
}

/**
 * Muestra un cuadro de confirmación y elimina el evento si el usuario acepta.
 */
const confirmDeleteEvent = async () => {
  if (!confirm('¿Estás seguro de eliminar este evento?')) return

  try {
    loading.value = true
    if (!userStore.isAuthenticated()) throw new Error('La sesión ha expirado')

    const response = await api.deleteEvent(eventData.value.id)
    if (response.status === 200) {
      toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Evento eliminado correctamente', life: 3000 })
      router.push({ name: 'gestionarEventos' })
    }
  } catch (error) {
    console.error('Error eliminando evento:', error)
    if (error.response?.status === 403 || error.message.includes('sesión')) {
      toast.add({ severity: 'error', summary: 'Sesión expirada', detail: 'Por favor inicie sesión nuevamente', life: 4000 })
      userStore.clearAuth()
      router.push('/login')
    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.message || error.message, life: 4000 })
    }
  } finally {
    loading.value = false
  }
}

/**
 * Carga los datos del evento al montar el componente.
 */
onMounted(async () => {
  try {
    loading.value = true
    if (!userStore.isAuthenticated()) throw new Error('La sesión ha expirado')

    const response = await api.getEventsByUsername(userStore.username)
    const target = response.data.find(e => e.id.toString() === route.params.id)
    if (!target) throw new Error('Evento no encontrado')

    originalEvent.value = target
    eventData.value = {
      id: target.id,
      title: decryptData(target.title),
      startDate: new Date(target.startDate),
      startTime: target.startTime ? new Date(`1970-01-01T${target.startTime}`) : null,
      endDate: new Date(target.endDate),
      endTime: target.endTime ? new Date(`1970-01-01T${target.endTime}`) : null,
      allDay: target.allDay || false,
      description: decryptData(target.description),
      color: decryptData(target.color) || '#4361ee'
    }

    const decrypted = (target.invitedUserEmail ?? []).map(decryptData)
    invitedUsers.value = decrypted
    originalInvitedUsers.value = [...decrypted]
  } catch (error) {
    console.error('Error al cargar evento:', error)
    if (error.response?.status === 403 || error.message.includes('sesión')) {
      toast.add({ severity: 'error', summary: 'Sesión expirada', detail: 'Por favor inicie sesión nuevamente', life: 4000 })
      userStore.clearAuth()
      router.push('/login')
    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'No se pudo cargar el evento', life: 4000 })
      router.push({ name: 'gestionarEventos' })
    }
  } finally {
    loading.value = false
  }
})

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

.create-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }

  .create-container {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
