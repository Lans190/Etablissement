import logging
from .models import SMSLog
from django.conf import settings

logger = logging.getLogger(__name__)

class SMSService:
    @staticmethod
    def send_sms(school, recipient_number, message):
        """
        Envoie un SMS via un provider (Twilio, Orange, etc.) 
        et enregistre le log. Pour l'instant, simule l'envoi.
        """
        # 1. Créer le log en attente
        log = SMSLog.objects.create(
            school=school,
            recipient_number=recipient_number,
            message=message,
            status=SMSLog.StatusChoices.PENDING
        )

        try:
            # SIMULATION D'ENVOI
            # Ici on brancherait l'API réelle (ex: requests.post('https://api.orange.com/...'))
            logger.info(f"SIMULATION SMS: Pour {recipient_number} - Message: {message}")
            
            # Succès de la simulation
            log.status = SMSLog.StatusChoices.SENT
            log.provider_response = "SIMULATED_SUCCESS"
            log.save()
            return True

        except Exception as e:
            log.status = SMSLog.StatusChoices.FAILED
            log.provider_response = str(e)
            log.save()
            logger.error(f"ECHEC SMS: {str(e)}")
            return False

    @staticmethod
    def send_bulk_sms(school, recipients, message):
        """
        Envoie un message à une liste de destinataires.
        recipients: Liste de numéros de téléphone.
        """
        results = []
        for number in recipients:
            if number:
                res = SMSService.send_sms(school, number, message)
                results.append(res)
        return results
