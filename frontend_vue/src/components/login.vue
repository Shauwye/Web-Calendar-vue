<script setup>
/**
 * @file LoginForm.vue
 * @description Componente de inicio de sesión que permite al usuario autenticarse con su nombre de usuario y contraseña.
 * Incluye funcionalidad de "Recuérdame", manejo de errores, y navegación a otras vistas como el registro.
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/service/api.js'
import { useUserStore } from '@/stores/userStore'

/**
 * Router para redirección de rutas.
 * @type {Router}
 */
const router = useRouter()

/**
 * Store de usuario para manejar autenticación y datos del usuario.
 * @type {Object}
 */
const userStore = useUserStore()

/**
 * Datos del formulario de login.
 * @type {Ref<{ username: string, password: string }>}
 */
const formData = ref({
  username: '',
  password: ''
})

/**
 * Mensaje de error a mostrar si ocurre un fallo en el login.
 * @type {Ref<string>}
 */
const errorMessage = ref('')

/**
 * Indica si el formulario está en proceso de envío.
 * @type {Ref<boolean>}
 */
const isLoading = ref(false)

/**
 * Indica si se debe recordar el nombre de usuario.
 * @type {Ref<boolean>}
 */
const rememberMe = ref(false)

/**
 * Maneja el envío del formulario de login.
 * Realiza una petición al backend y guarda el token si es exitoso.
 * Maneja errores específicos según el código de respuesta.
 * @returns {Promise<void>}
 */
const handleLogin = async () => {
  if (!formData.value.username || !formData.value.password) {
    errorMessage.value = 'Por favor completa todos los campos'
    return
  }

  try {
    isLoading.value = true
    errorMessage.value = ''

    const response = await api.login({
      username: formData.value.username,
      password: formData.value.password
    })

    userStore.setToken(response.data.token)
    userStore.setUsername(formData.value.username)

    if (rememberMe.value) {
      localStorage.setItem('rememberedUsername', formData.value.username)
    } else {
      localStorage.removeItem('rememberedUsername')
    }

    router.push('/calendario')
  } catch (error) {
    console.error('Error de login:', error)
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage.value = 'Usuario o contraseña incorrectos'
      } else {
        errorMessage.value = 'Error al iniciar sesión. Intenta nuevamente.'
      }
    } else {
      errorMessage.value = 'No se pudo conectar con el servidor'
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * Redirige a la vista de registro.
 */
const goToRegister = () => {
  router.push('/register')
}

/**
 * Carga las credenciales guardadas si el usuario eligió "Recuérdame".
 */
const loadRememberedCredentials = () => {
  const rememberedUsername = localStorage.getItem('rememberedUsername')
  if (rememberedUsername) {
    formData.value.username = rememberedUsername
    rememberMe.value = true
  }
}

// Ejecuta al montar el componente
loadRememberedCredentials()

</script>

<template>
  <div class="login-container">
    <h1>Iniciar Sesión</h1>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div class="input-group">
      <label for="username">Usuario</label>
      <input
          type="text"
          id="username"
          v-model="formData.username"
          placeholder="Tu nombre de usuario"
          class="input-field"
      >
    </div>
    <div class="input-group">
      <label for="password">Contraseña</label>
      <input
          type="password"
          id="password"
          v-model="formData.password"
          placeholder="Tu contraseña"
          class="input-field"
      >
    </div>
    <div class="button-group">
      <button
          class="primary"
          @click="handleLogin"
          :disabled="isLoading"
      >
        {{ isLoading ? 'Ingresando...' : 'Ingresar' }}
      </button>
      <button class="secondary" @click="goToRegister">Registrarse</button>
    </div>
    <div class="options-row">
      <label class="remember-me">
        <input type="checkbox" v-model="rememberMe">
        <span>Recordarme</span>
      </label>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem;
  border-radius: 16px;
  background: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  width: 340px;
  margin: 2rem auto;
  border: 1px solid rgba(0, 0, 0, 0.05);
  font-family: 'Inter', sans-serif;
}

h1 {
  margin-bottom: 1.5rem;
  color: #2c3e50;
  font-size: 1.75rem;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  letter-spacing: -0.5px;
  background: linear-gradient(to right, #4a6cf7, #6a11cb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.input-group {
  width: 100%;
  margin-bottom: 1.25rem;
  position: relative;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4a5568;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.input-field {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9375rem;
  transition: all 0.3s ease;
  background-color: #f8fafc;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  font-family: 'Inter', sans-serif;
}

.input-field:focus {
  outline: none;
  border-color: #4a6cf7;
  box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.15);
  background-color: white;
}

.button-group {
  display: flex;
  width: 100%;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.3px;
}

.primary {
  background: linear-gradient(to right, #4a6cf7, #6a11cb);
  box-shadow: 0 4px 6px rgba(74, 108, 247, 0.2);
}

.secondary {
  background: linear-gradient(to right, #718096, #4a5568);
  box-shadow: 0 4px 6px rgba(113, 128, 150, 0.2);
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

button:active {
  transform: translateY(0);
}

.options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 1.5rem;
  font-size: 0.8125rem;
  gap: 2rem;
  padding: 0 0.5rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4a5568;
  cursor: pointer;
  font-weight: 500;
}

.remember-me input {
  accent-color: #4a6cf7;
}

.forgot-password {
  color: #4a6cf7;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
  letter-spacing: 0.2px;
}

.forgot-password:hover {
  color: #3b5bdb;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-container {
    width: 90%;
    padding: 1.5rem;
  }

  h1 {
    font-size: 1.5rem;
  }
}

.error-message {
  color: #ff3860;
  background-color: #fff5f5;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #ff3860;
  font-size: 0.9rem;
  width: 100%;
  text-align: center;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}
</style>