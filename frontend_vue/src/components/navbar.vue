<script setup>
/**
 * @file UserDropdown.vue
 * @description Componente que muestra el nombre del usuario autenticado con un menú desplegable para cerrar sesión.
 */

import { useRouter } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'

/**
 * Router para redireccionar al usuario tras cerrar sesión.
 * @type {Router}
 */
const router = useRouter()

/**
 * Store de usuario para manejar datos de autenticación y usuario.
 * @type {Object}
 */
const userStore = useUserStore()

/**
 * Estado que indica si el menú desplegable está abierto.
 * @type {Ref<boolean>}
 */
const isDropdownOpen = ref(false)

/**
 * Referencia al contenedor del menú desplegable para detectar clicks fuera.
 * @type {Ref<HTMLElement|null>}
 */
const dropdownRef = ref(null)

/**
 * Nombre de usuario actual obtenido del store, con valor por defecto "Usuario".
 * @type {ComputedRef<string>}
 */
const userName = computed(() => userStore.username || 'Usuario')

/**
 * Alterna la visibilidad del menú desplegable.
 */
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

/**
 * Cierra el menú desplegable si se hace click fuera de él.
 * @param {MouseEvent} event Evento de click global.
 */
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false
  }
}

/**
 * Limpia la autenticación del usuario y redirige al login.
 */
const logout = () => {
  isDropdownOpen.value = false
  userStore.clearAuth()
  router.push('/login')
}

/**
 * Añade el listener global para detectar clicks fuera del menú.
 */
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

/**
 * Elimina el listener global al desmontar el componente.
 */
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

</script>

<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <router-link to="/" class="logo-link">
        <span class="logo-text">TU CALENDARIO</span>
      </router-link>
    </div>

    <div class="navbar-links">
      <router-link
          to="/calendario"
          class="nav-link"
          active-class="active-link"
      >
        Calendario
      </router-link>
      <router-link
          to="/crearEvento"
          class="nav-link"
          active-class="active-link"
      >
        Evento Nuevo
      </router-link>
      <router-link
          to="/gestionarEventos"
          class="nav-link"
          active-class="active-link"
      >
        Tus eventos
      </router-link>
    </div>

    <div class="navbar-actions">
      <div class="dropdown" ref="dropdownRef">
        <button class="user-menu" @click="toggleDropdown">
          <span class="user-avatar">👤</span>
          <span class="user-name">{{ userName }}</span>
          <span class="dropdown-icon">▼</span>
        </button>
        <ul class="dropdown-menu" :class="{ show: isDropdownOpen }">
          <li><a href="#" @click.prevent="logout">Cerrar Sesión</a></li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 2rem;
  background-color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid #e0e0e0;
  font-family: 'Roboto', Arial, sans-serif;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.logo-text {
  font-size: 1.3rem;
  font-weight: 600;
  color: #3c4043;
  background: linear-gradient(to right, #9e5fff, #00a9ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.navbar-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  text-decoration: none;
  color: #5f6368;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: #9e5fff;
}

.active-link {
  color: #9e5fff;
  font-weight: 600;
}

.active-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, #9e5fff, #00a9ff);
  border-radius: 2px;
}

.navbar-actions {
  display: flex;
  align-items: center;
}

.dropdown {
  position: relative;
}

.user-menu {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  transition: background-color 0.2s;
}

.user-menu:hover {
  background-color: #f1f3f4;
}

.user-avatar {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.user-name {
  font-size: 0.9rem;
  color: #3c4043;
  margin-right: 0.3rem;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-icon {
  font-size: 0.6rem;
  color: #5f6368;
  transition: transform 0.2s;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0.5rem 0;
  list-style: none;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: none;
}

.dropdown-menu.show {
  display: block;
  animation: fadeIn 0.2s ease-out;
}

.dropdown-menu li a {
  display: block;
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: #333;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.dropdown-menu li a:hover {
  background-color: #f8f9fa;
  color: #9e5fff;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .navbar {
    padding: 0.8rem 1rem;
    flex-wrap: wrap;
  }

  .navbar-links {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: 0.5rem;
    gap: 1rem;
  }

  .navbar-actions {
    margin-left: auto;
  }

  .user-name {
    max-width: 80px;
  }
}

@media (max-width: 480px) {
  .logo-text {
    font-size: 1.1rem;
  }

  .nav-link {
    font-size: 0.85rem;
  }

  .user-name {
    display: none;
  }
}
</style>