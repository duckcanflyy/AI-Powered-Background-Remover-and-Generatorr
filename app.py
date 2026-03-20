from io import BytesIO
from flask import Flask, render_template, request, jsonify
import requests
from PIL import Image
import base64

app = Flask(__name__)

# URL Google Colab (cần cập nhật thường xuyên nếu dùng ngrok miễn phí)
NGROK_URL = "https://pony-beloved-positively.ngrok-free.app"

# Kiểm tra định dạng file ảnh
def validate_image(file):
    try:
        img = Image.open(file)
        if img.format not in ['PNG', 'JPEG']:
            return False
        file.seek(0)  # Reset file pointer
        return True
    except:
        return False

# Routes
@app.route("/")
def index():
    return render_template('home.html')

@app.route("/remove-bg")
def remove_background():
    return render_template('remove-bg.html')

# APIs
@app.route("/remove-background", methods=["POST"])
def remove_background_image():
    if "image" not in request.files:
        return jsonify({
            "status": "error",
            "code": 400,
            "data": "Please upload an image"
        }), 400

    image_file = request.files["image"]
    if not validate_image(image_file):
        return jsonify({
            "status": "error",
            "code": 400,
            "data": "Invalid image format. Only PNG or JPEG allowed"
        }), 400

    files = {
        "image": (image_file.filename, image_file.stream, image_file.content_type),
    }

    try:
        response = requests.post(f"{NGROK_URL}/remove-background", files=files)
        if response.status_code == 200:
            image_data = BytesIO(response.content)
            img = Image.open(image_data)
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
            return jsonify({
                "status": "success",
                "code": 200,
                "data": f"data:image/png;base64,{img_str}"
            })
        else:
            return jsonify({
                "status": "error",
                "code": response.status_code,
                "data": response.text or "Failed to remove background"
            }), response.status_code
    except Exception as e:
        return jsonify({
            "status": "error",
            "code": 500,
            "data": f"Server error: {str(e)}"
        }), 500

@app.route("/generate", methods=["POST"])
def generate_image():
    if request.content_type != "application/json":
        return jsonify({
            "status": "error",
            "code": 415,
            "data": "Use 'application/json'"
        }), 415

    data = request.json
    background_text = data.get("background_text")
    if not background_text:
        return jsonify({
            "status": "error",
            "code": 400,
            "data": "Missing background_text"
        }), 400

    prompt = f"Create a high-quality background image featuring the following requirement: {background_text}. Ensure a visually appealing composition that is not too cluttered, making it suitable as a background."

    try:
        response = requests.post(f"{NGROK_URL}/generate", json={"prompt": prompt})
        if response.status_code == 200:
            image_data = BytesIO(response.content)
            img = Image.open(image_data)
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
            return jsonify({
                "status": "success",
                "code": 200,
                "data": f"data:image/png;base64,{img_str}"
            })
        else:
            return jsonify({
                "status": "error",
                "code": response.status_code,
                "data": response.text or "Failed to generate image"
            }), response.status_code
    except Exception as e:
        return jsonify({
            "status": "error",
            "code": 500,
            "data": f"Server error: {str(e)}"
        }), 500

@app.route("/add-background", methods=["POST"])
def add_background_to_image():
    if "image" not in request.files or "background" not in request.files:
        return jsonify({
            "status": "error",
            "code": 400,
            "data": "Upload both 'image' and 'background'"
        }), 400

    image_file = request.files["image"]
    background_file = request.files["background"]
    if not (validate_image(image_file) and validate_image(background_file)):
        return jsonify({
            "status": "error",
            "code": 400,
            "data": "Invalid image format. Only PNG or JPEG allowed"
        }), 400

    files = {
        "image": (image_file.filename, image_file.stream, image_file.content_type),
        "background": (background_file.filename, background_file.stream, background_file.content_type),
    }

    try:
        response = requests.post(f"{NGROK_URL}/add-background", files=files)
        if response.status_code == 200:
            image_data = BytesIO(response.content)
            img = Image.open(image_data)
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
            return jsonify({
                "status": "success",
                "code": 200,
                "data": f"data:image/png;base64,{img_str}"
            })
        else:
            return jsonify({
                "status": "error",
                "code": response.status_code,
                "data": response.text or "Failed to add background"
            }), response.status_code
    except Exception as e:
        return jsonify({
            "status": "error",
            "code": 500,
            "data": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True)