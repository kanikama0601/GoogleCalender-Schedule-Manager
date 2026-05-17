FROM python:3.12-slim

# Install uv using the official image binary copy method
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy project configuration files first for Docker layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync (excluding dev dependencies and the project itself)
RUN uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application files
COPY . .

# Add the virtual environment bin path to PATH
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
