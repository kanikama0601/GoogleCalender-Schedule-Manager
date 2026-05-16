import os
import json
import logging
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Allow insecure transport for local development (http instead of https)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_FILE = 'token.json'
CLIENT_SECRETS_FILE = 'credentials.json'

def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        except Exception as e:
            logger.error(f"Error loading credentials from file: {e}")
            return None
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(TOKEN_FILE, 'w') as token:
                    token.write(creds.to_json())
            except Exception as e:
                logger.error(f"Error refreshing credentials: {e}")
                return None
        else:
            return None
    return creds

def save_token_from_code(code, redirect_uri, code_verifier=None):
    try:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        # Pass the code_verifier back to fetch_token
        flow.fetch_token(code=code, code_verifier=code_verifier)
        creds = flow.credentials
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
        logger.info("Successfully saved token to token.json")
        return creds
    except Exception as e:
        logger.error(f"Error fetching token: {e}")
        raise e

def get_auth_url(redirect_uri):
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    # access_type='offline' is required to get a refresh_token
    auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
    # Return both URL and the verifier
    return auth_url, flow.code_verifier
