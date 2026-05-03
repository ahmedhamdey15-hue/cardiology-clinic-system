FROM python:3.12-alpine
WORKDIR /app
RUN sed -i 's/https/http/g' /etc/apk/repositories
RUN apk add --no-cache postgresql-dev gcc musl-dev tzdata
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
