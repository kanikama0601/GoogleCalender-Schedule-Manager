import os
import logging
from google.oauth2 import service_account

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar']
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

SERVICE_ACCOUNT_FILE = os.path.join(DATA_DIR, 'service_account.json')


def get_credentials():
    """サービスアカウントのJSONファイルから認証情報を取得する"""
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        logger.error(f"Service account file not found at: {SERVICE_ACCOUNT_FILE}")
        return None

    try:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=SCOPES
        )
        logger.info("Successfully loaded service account credentials.")
        return creds
    except Exception as e:
        logger.error(f"Error loading service account credentials: {e}")
        return None


def save_token_from_code(code, redirect_uri, code_verifier=None):
    """
    【サービスアカウントでは不要】
    既存コードとの互換性維持のために残していますが、何も処理せずget_credentials()を返します。
    """
    logger.info("Service account mode: Skipping token fetch from code.")
    return get_credentials()


def get_auth_url(redirect_uri):
    """
    【サービスアカウントでは不要】
    既存コードとの互換性維持のために残していますが、URLや検証コードは不要なためNoneを返します。
    """
    logger.info("Service account mode: Authentication URL is not required.")
    return None, None