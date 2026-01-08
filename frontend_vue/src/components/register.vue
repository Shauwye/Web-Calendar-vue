<script setup>
/**
 * @file RegisterForm.vue
 * @description Lógica del formulario de registro con validación, envío de código de verificación por email y control de expiración.
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/service/api.js';
import { sendVerificationEmail } from '@/service/emailService.js';

/**
 * Instancia del router para redirecciones.
 * @type {Router}
 */
const router = useRouter();

/**
 * Datos del formulario de registro.
 * @type {Ref<{username: string, email: string, password: string, confirmPassword: string}>}
 */
const formData = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

/**
 * Mensaje de error para mostrar al usuario.
 * @type {Ref<string>}
 */
const errorMessage = ref('');

/**
 * Indica si está en proceso de carga (loading).
 * @type {Ref<boolean>}
 */
const isLoading = ref(false);

/**
 * Controla la visibilidad del modal para ingreso del código de verificación.
 * @type {Ref<boolean>}
 */
const showVerificationModal = ref(false);

/**
 * Código de verificación generado y enviado al email.
 * @type {Ref<string>}
 */
const verificationCodeSent = ref('');

/**
 * Código que el usuario ingresa para verificar.
 * @type {Ref<string>}
 */
const userVerificationCode = ref('');

/**
 * Segundos restantes para expiración del código.
 * @type {Ref<number>}
 */
const countdown = ref(0);

/**
 * Referencia al intervalo para el contador regresivo.
 * @type {Ref<number|null>}
 */
const countdownInterval = ref(null);

/**
 * Genera un código aleatorio de 6 dígitos como string.
 * @returns {string}
 */
const generateRandomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Inicia el contador regresivo de 10 minutos (600 segundos) para el código.
 */
const startCountdown = () => {
  countdown.value = 600;
  clearInterval(countdownInterval.value);
  countdownInterval.value = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--;
    } else {
      clearInterval(countdownInterval.value);
    }
  }, 1000);
};

/**
 * Formatea el tiempo en segundos a formato "mm:ss".
 * @param {number} seconds
 * @returns {string}
 */
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Maneja el envío del formulario de registro, valida datos y envía código de verificación.
 */
const handleSubmit = async () => {
  errorMessage.value = '';

  // Validación de contraseñas iguales
  if (formData.value.password !== formData.value.confirmPassword) {
    errorMessage.value = 'Las contraseñas no coinciden.';
    return;
  }

  // Validación de contraseña segura
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#])[A-Za-z\d@$!%*?#]{12,}$/;
  if (!passwordRegex.test(formData.value.password)) {
    errorMessage.value = 'La contraseña debe tener al menos 12 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial (@$!%*?#).';
    return;
  }

  // Validación de email
  const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;
  if (!emailRegex.test(formData.value.email)) {
    errorMessage.value = 'Por favor, ingrese un correo electrónico válido.';
    return;
  }

  try {
    isLoading.value = true;

    const registrationCheckData = {
      username: formData.value.username,
      password: formData.value.password,
      email: formData.value.email,
      confirmPassword: formData.value.confirmPassword,
      role: 'USER'
    };

    // Llama a la API para registrar usuario
    await api.register(registrationCheckData);

    // Genera código y envía email
    verificationCodeSent.value = generateRandomCode();
    const emailSent = await sendVerificationEmail(formData.value.email, verificationCodeSent.value);

    if (!emailSent) {
      throw new Error('No se pudo enviar el código de verificación. Intente nuevamente.');
    }

    showVerificationModal.value = true;
    startCountdown();

  } catch (error) {
    if (error.response) {
      const backendMessage = error.response.data?.mensaje;
      errorMessage.value = backendMessage || 'Error al registrar el usuario. Verifique su información.';
    } else {
      errorMessage.value = 'Error de conexión con el servidor. Intente nuevamente.';
    }
    console.error('Registration Error:', error);
  } finally {
    isLoading.value = false;
  }
};

/**
 * Verifica que el código ingresado por el usuario coincida y no haya expirado.
 */
const handleVerifyCode = async () => {
  errorMessage.value = '';

  if (countdown.value <= 0) {
    errorMessage.value = 'El código ha expirado. Por favor solicite uno nuevo.';
    return;
  }

  if (userVerificationCode.value !== verificationCodeSent.value) {
    errorMessage.value = 'Código de verificación incorrecto.';
    return;
  }

  showVerificationModal.value = false;
  router.push('/login');
};

/**
 * Reenvía un nuevo código de verificación y reinicia el contador.
 */
const resendCode = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    const registrationCheckData = {
      username: formData.value.username,
      password: formData.value.password,
      email: formData.value.email,
      confirmPassword: formData.value.confirmPassword,
      role: 'USER'
    };

    // Vuelve a llamar a registro para verificar info y reenviar código
    await api.register(registrationCheckData);

    verificationCodeSent.value = generateRandomCode();
    const emailSent = await sendVerificationEmail(formData.value.email, verificationCodeSent.value);

    if (!emailSent) {
      throw new Error('No se pudo reenviar el código.');
    }

    startCountdown();
    errorMessage.value = 'Nuevo código enviado con éxito.';
  } catch (error) {
    if (error.response) {
      errorMessage.value = error.response.data?.mensaje || 'Error al reenviar el código. El usuario o email podría ya estar registrado.';
    } else {
      errorMessage.value = 'Error de conexión al reenviar el código. Intente nuevamente.';
    }
    console.error('Resend Code Error:', error);
  } finally {
    isLoading.value = false;
  }
};

</script>

<template>
  <div class="register-container">
    <h2>Crear Cuenta</h2>

    <div v-if="errorMessage && !showVerificationModal" class="error-message">
      {{ errorMessage }}
    </div>

    <form @submit.prevent="handleSubmit" class="register-form">
      <div class="form-group">
        <label for="name">Nombre de usuario</label>
        <input
            type="text"
            id="name"
            v-model="formData.username"
            required
        >
      </div>

      <div class="form-group">
        <label for="email">Correo electrónico</label>
        <input
            type="email"
            id="email"
            v-model="formData.email"
            required
        >
      </div>

      <div class="form-group">
        <label for="password">Contraseña</label>
        <input
            type="password"
            id="password"
            v-model="formData.password"
            required
        >
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirmar contraseña</label>
        <input
            type="password"
            id="confirmPassword"
            v-model="formData.confirmPassword"
            required
        >
      </div>

      <button type="submit" class="submit-btn" :disabled="isLoading">
        {{ isLoading ? 'Procesando...' : 'Registrarse' }}
      </button>
    </form>

    <div class="auth-footer">
      <p>¿Ya tienes cuenta? <router-link to="/login">Inicia sesión</router-link></p>
    </div>
  </div>

  <div v-if="showVerificationModal" class="modal-overlay">
    <div class="modal-content">
      <h3>Verificación de correo</h3>
      <p>Hemos enviado un código de verificación a <strong>{{ formData.email }}</strong></p>

      <div class="form-group">
        <label for="verificationCode">Código de verificación</label>
        <input
            type="text"
            id="verificationCode"
            v-model="userVerificationCode"
            required
            maxlength="6"
        >
      </div>

      <div class="countdown">
        <p v-if="countdown > 0">El código expira en: {{ formatTime(countdown) }}</p>
        <p v-else class="expired">El código ha expirado</p>
      </div>

      <button @click="handleVerifyCode" class="submit-btn" :disabled="isLoading">
        {{ isLoading ? 'Verificando...' : 'Verificar' }}
      </button>

      <button @click="resendCode" class="secondary-btn" :disabled="isLoading || countdown > 300">
        Reenviar código
      </button>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <button v-if="!isLoading && !errorMessage" @click="router.push('/login')" class="secondary-btn mt-3">
        Ir a Iniciar Sesión
      </button>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  max-width: 420px;
  margin: 3rem auto;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  background: #fff;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

h2, h3 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: 600;
}

h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

label {
  font-weight: 500;
  color: #34495e;
  font-size: 0.95rem;
}

input {
  padding: 0.85rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
}

input:focus {
  outline: none;
  border-color: #4361ee;
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
  background-color: #fff;
}

input::placeholder {
  color: #a0a0a0;
  opacity: 1;
}

.submit-btn, .secondary-btn {
  color: white;
  padding: 0.9rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.submit-btn {
  background-color: #4361ee;
}

.submit-btn:hover:not(:disabled) {
  background-color: #3a56d4;
  transform: translateY(-1px);
}

.secondary-btn {
  background-color: #718096;
}

.secondary-btn:hover:not(:disabled) {
  background-color: #4a5568;
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

.auth-footer {
  text-align: center;
  margin-top: 2rem;
  color: #7f8c8d;
  font-size: 0.95rem;
}

.auth-footer a {
  color: #4361ee;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.auth-footer a:hover {
  color: #3a56d4;
  text-decoration: underline;
}

.error-message {
  color: #ff3860;
  background-color: #fff5f5;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #ff3860;
  font-size: 0.9rem;
}

.countdown {
  text-align: center;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.countdown .expired {
  color: #ff3860;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none !important;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.6rem;
  font-weight: 600;
}

.modal-content p {
  color: #34495e;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.modal-content .form-group {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.modal-content input {
  width: calc(100% - 22px);
  text-align: center;
  letter-spacing: 0.2rem;
  font-size: 1.2rem;
  padding: 1rem;
}

.modal-content .submit-btn {
  width: 100%;
  margin-top: 1rem;
}

@media (max-width: 480px) {
  .register-container {
    margin: 1.5rem;
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.5rem;
  }
}
</style>