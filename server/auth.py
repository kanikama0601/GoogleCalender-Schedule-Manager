import os
import logging
from google.oauth2 import service_account

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar']
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(DATA_DIR, exist_ok=True)
SERVICE_ACCOUNT_FILE = os.path.join(DATA_DIR, 'service_account_key.json')

def get_credentials():
    if os.path.exists(SERVICE_ACCOUNT_FILE):
        try:
            creds = service_account.Credentials.from_service_account_file(
                SERVICE_ACCOUNT_FILE, scopes=SCOPES)
            return creds
        except Exception as e:
            logger.error(f"Error loading service account credentials: {e}")
            return None
    else:
        logger.error(f"Service account key file not found: {SERVICE_ACCOUNT_FILE}")
        return None
