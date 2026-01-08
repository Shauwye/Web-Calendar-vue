<template>
  <div class="page-layout">
    <Navbar />
    <div class="events-management-page">
      <div class="management-container">
        <h2>Gestionar Eventos</h2>

        <div class="toolbar">
          <InputText v-model="searchTerm" placeholder="Buscar eventos..." class="search-input" />
          <Button label="Nuevo Evento" icon="pi pi-plus" @click="goToCreateEvent" />
        </div>

        <DataTable :value="filteredEvents" paginator :rows="5" :rowsPerPageOptions="[5,10,20]"
                   paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                   currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} eventos"
                   class="events-table" :loading="loading">
          <Column field="title" header="Título" sortable></Column>
          <Column field="startDate" header="Fecha Inicio" sortable>
            <template #body="{data}">
              {{ formatDate(data.startDate) }} {{ data.startTime ? formatTime(data.startTime) : '' }}
            </template>
          </Column>
          <Column field="endDate" header="Fecha Fin" sortable>
            <template #body="{data}">
              {{ formatDate(data.endDate) }} {{ data.endTime ? formatTime(data.endTime) : '' }}
            </template>
          </Column>
          <Column field="description" header="Descripción" class="description-column"></Column>
          <Column header="Color" class="color-column">
            <template #body="{data}">
              <div class="color-indicator" :style="{ backgroundColor: data.color }"></div>
            </template>
          </Column>
          <Column header="Archivos" class="files-column">
            <template #body="{data}">
              <div v-if="data.attachedFiles && data.attachedFiles.length > 0" class="files-info">
                <Button
                    icon="pi pi-paperclip"
                    class="p-button-rounded p-button-text p-button-sm"
                    @click="showFiles(data)"
                    :badge="data.attachedFiles.length.toString()"
                />
              </div>
              <span v-else class="no-files">Sin archivos</span>
            </template>
          </Column>
          <Column header="Acciones" class="actions-column">
            <template #body="{data}">
              <div class="action-buttons">
                <Button icon="pi pi-pencil" class="p-button-rounded p-button-text p-button-primary"
                        @click="editEvent(data)" />
                <Button icon="pi pi-trash" class="p-button-rounded p-button-text p-button-danger"
                        @click="confirmDelete(data)" />
              </div>
            </template>
          </Column>
        </DataTable>

        <!-- Dialog para confirmar eliminación -->
        <Dialog v-model:visible="deleteDialogVisible" header="Confirmar Eliminación" :modal="true">
          <p>¿Estás seguro de eliminar este evento?</p>
          <template #footer>
            <Button label="Cancelar" icon="pi pi-times" @click="deleteDialogVisible = false" class="p-button-text" />
            <Button label="Eliminar" icon="pi pi-check" @click="deleteEvent" class="p-button-danger" autofocus />
          </template>
        </Dialog>

        <!-- Dialog para mostrar archivos -->
        <Dialog v-model:visible="filesDialogVisible" header="Archivos Adjuntos" :modal="true" :style="{width: '50vw'}">
          <div v-if="selectedEventFiles && selectedEventFiles.length > 0" class="files-list">
            <div v-for="(file, index) in selectedEventFiles" :key="index" class="file-item">
              <div class="file-info">
                <i :class="getFileIcon(file.type)" class="file-icon"></i>
                <div class="file-details">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
              </div>
              <Button
                  label="Descargar"
                  icon="pi pi-download"
                  class="p-button-sm p-button-outlined"
                  @click="downloadFile(file)"
              />
            </div>
          </div>
          <p v-else>No hay archivos adjuntos</p>
          <template #footer>
            <Button label="Cerrar" @click="filesDialogVisible = false" />
          </template>
        </Dialog>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Componente de gestión de eventos. Permite ver, buscar, editar y eliminar eventos del usuario.
 */

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/navbar.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import api from '@/service/api'
import forge from 'node-forge'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

// Redirige al login si el usuario no está autenticado
if (!userStore.isAuthenticated()) {
  router.push('/login')
}

/**
 * Lista de eventos del usuario
 * @type {import('vue').Ref<Array>}
 */
const events = ref([])

/**
 * Término de búsqueda para filtrar eventos
 * @type {import('vue').Ref<string>}
 */
const searchTerm = ref('')

/**
 * Controla la visibilidad del diálogo de eliminación
 * @type {import('vue').Ref<boolean>}
 */
const deleteDialogVisible = ref(false)

/**
 * Controla la visibilidad del diálogo de archivos adjuntos
 * @type {import('vue').Ref<boolean>}
 */
const filesDialogVisible = ref(false)

/**
 * Evento actualmente seleccionado para eliminar o ver archivos
 * @type {import('vue').Ref<Object|null>}
 */
const selectedEvent = ref(null)

/**
 * Archivos adjuntos del evento seleccionado
 * @type {import('vue').Ref<Array>}
 */
const selectedEventFiles = ref([])

/**
 * Indica si los eventos están siendo cargados
 * @type {import('vue').Ref<boolean>}
 */
const loading = ref(false)

/**
 * Descifra un texto usando AES-GCM
 * @param {string} encryptedData - Texto cifrado en base64
 * @returns {string} - Texto descifrado o original si falla
 */
const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return ''
    const key = 'llavede16carater'
    const iv = 'programacioncomp'
    const encryptedBytes = forge.util.decode64(encryptedData)
    const tag = encryptedBytes.slice(-16)
    const ciphertext = encryptedBytes.slice(0, -16)
    const cipher = forge.cipher.createDecipher('AES-GCM', forge.util.createBuffer(key))
    cipher.start({ iv: forge.util.createBuffer(iv), tag: forge.util.createBuffer(tag) })
    cipher.update(forge.util.createBuffer(ciphertext))
    const result = cipher.finish()
    return result ? cipher.output.toString() : encryptedData
  } catch {
    return encryptedData
  }
}

/**
 * Parsea un array de strings JSON a objetos de archivo
 * @param {Array<string>} array
 * @returns {Array<Object>}
 */
const parseAttachedFiles = (array) => {
  if (!Array.isArray(array)) return []
  return array.map(fileStr => {
    try {
      return JSON.parse(fileStr)
    } catch {
      return null
    }
  }).filter(Boolean)
}

/**
 * Carga los eventos del usuario desde la API
 * y los descifra para su visualización
 */
const loadEvents = async () => {
  try {
    loading.value = true
    const response = await api.getEventsByUsername(userStore.username)
    if (response.data) {
      events.value = response.data.map(event => ({
        ...event,
        title: decryptData(event.title),
        description: decryptData(event.description),
        color: decryptData(event.color) || '#4361ee',
        attachedFiles: parseAttachedFiles(event.attachedFiles)
      }))
    }
  } catch (error) {
    console.error('Error al cargar eventos:', error)
    alert('No se pudieron cargar los eventos.')
  } finally {
    loading.value = false
  }
}

/**
 * Devuelve los eventos filtrados por el término de búsqueda
 */
const filteredEvents = computed(() => {
  if (!searchTerm.value) return events.value
  const term = searchTerm.value.toLowerCase()
  return events.value.filter(event =>
      event.title.toLowerCase().includes(term) ||
      event.description.toLowerCase().includes(term)
  )
})

/**
 * Formatea una fecha en formato local español
 * @param {string} dateString
 * @returns {string}
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Formatea una hora a HH:mm
 * @param {string} timeString
 * @returns {string}
 */
const formatTime = (timeString) => {
  return timeString?.substring(0, 5) || ''
}

/**
 * Formatea el tamaño de archivo en una unidad legible
 * @param {number} bytes
 * @returns {string}
 */
const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes'
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Devuelve el ícono correspondiente al tipo de archivo
 * @param {string} fileType
 * @returns {string}
 */
const getFileIcon = (fileType) => {
  if (fileType?.startsWith('image/')) return 'pi pi-image'
  if (fileType?.includes('pdf')) return 'pi pi-file-pdf'
  if (fileType?.includes('word')) return 'pi pi-file-word'
  if (fileType?.includes('text')) return 'pi pi-file-edit'
  return 'pi pi-file'
}

/**
 * Muestra los archivos adjuntos del evento
 * @param {Object} event
 */
const showFiles = (event) => {
  selectedEventFiles.value = event.attachedFiles || []
  filesDialogVisible.value = true
}

/**
 * Descarga un archivo en el cliente
 * @param {Object} file
 */
const downloadFile = (file) => {
  try {
    const byteCharacters = atob(file.content)
    const byteArray = new Uint8Array(byteCharacters.split('').map(c => c.charCodeAt(0)))
    const blob = new Blob([byteArray], { type: file.type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error al descargar archivo:', error)
  }
}

/**
 * Redirige a la vista de edición de evento
 * @param {Object} event
 */
const editEvent = (event) => {
  router.push({ name: 'editarEvento', params: { id: event.id } })
}

/**
 * Muestra el diálogo de confirmación de eliminación
 * @param {Object} event
 */
const confirmDelete = (event) => {
  selectedEvent.value = event
  deleteDialogVisible.value = true
}

/**
 * Elimina el evento seleccionado a través de la API
 */
const deleteEvent = async () => {
  try {
    const response = await api.deleteEvent(selectedEvent.value.id)
    if (response.status === 200) {
      events.value = events.value.filter(e => e.id !== selectedEvent.value.id)
      alert('Evento eliminado correctamente')
    }
  } catch (error) {
    console.error('Error al eliminar evento:', error)
    alert('No se pudo eliminar el evento')
  } finally {
    deleteDialogVisible.value = false
  }
}

/**
 * Redirige a la página de creación de evento
 */
const goToCreateEvent = () => {
  router.push({ name: 'crearEvento' })
}

// Carga los eventos al montar el componente
onMounted(loadEvents)
</script>



<style scoped>
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.events-management-page {
  flex: 1;
  padding: 2rem;
  background-color: #f8f9fa;
}

.management-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  text-align: center;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.search-input {
  flex-grow: 1;
  max-width: 400px;
}

.events-table {
  margin-top: 1rem;
}

.description-column {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.color-column {
  text-align: center;
  width: 80px;
}

.color-indicator {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin: 0 auto;
  border: 2px solid #e0e0e0;
}

.files-column {
  text-align: center;
  width: 100px;
}

.files-info {
  display: flex;
  justify-content: center;
}

.no-files {
  color: #6c757d;
  font-style: italic;
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.actions-column {
  width: 120px;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.file-icon {
  font-size: 1.5rem;
  color: #6c757d;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  color: #2c3e50;
}

.file-size {
  font-size: 0.875rem;
  color: #6c757d;
}

@media (max-width: 768px) {
  .management-container {
    padding: 1rem;
  }

  .toolbar {
    flex-direction: column;
  }

  .search-input {
    max-width: 100%;
  }

  .description-column {
    max-width: 150px;
  }

  .color-indicator {
    width: 25px;
    height: 25px;
  }

  .file-item {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .file-info {
    width: 100%;
  }
}
</style>