from backend import create_app

app = create_app()

if __name__ == '__main__':
    # Listen on all IPs when running inside Docker
    app.run(debug=True, host='0.0.0.0', port=5000)
