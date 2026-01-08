import brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.apiClient.authentications['api-key'].apiKey = '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';

export const sendVerificationEmail = async (email, verificationCode) => {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Código de verificación";
    sendSmtpEmail.htmlContent = `
    <p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
    <p>Este código expirará en 10 minutos.</p>
  `;
    sendSmtpEmail.sender = {
        name: "Tu Calendario",
        email: "tucalendariounbosque@gmail.com"
    };
    sendSmtpEmail.to = [{ email }];

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        return true;
    } catch (error) {
        console.error("Error enviando email:", error);
        return false;
    }
};

export const sendEventInvitationEmail = async (email, eventTitle, startDate, endDate, inviterName) => {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = `Invitación a evento: ${eventTitle}`;
    sendSmtpEmail.htmlContent = `
    <h3>Has sido invitado a un evento</h3>
    <p><strong>Evento:</strong> ${eventTitle}</p>
    <p><strong>Inició:</strong> ${new Date(startDate).toLocaleString()}</p>
    <p><strong>Finaliza:</strong> ${new Date(endDate).toLocaleString()}</p>
    <p><strong>Invitado por:</strong> ${inviterName}</p>
    <p>Por favor inicia sesión en la aplicación para ver los detalles.</p>
  `;

    sendSmtpEmail.sender = {
        name: "Tu Calendario",
        email: "dgarayra@unbosque.edu.co"
    };

    sendSmtpEmail.to = [{ email }];

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        return true;
    } catch (error) {
        console.error("Error enviando invitación:", error);
        return false;
    }
};