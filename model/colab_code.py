# THIS PART DIDN'T BE USED HERE!!, COPY THIS TO COLAB AND RUN BEFORE FLASK SERVER
# THIS PART DIDN'T BE USED HERE!!, COPY THIS TO COLAB AND RUN BEFORE FLASK SERVER
# THIS PART DIDN'T BE USED HERE!!, COPY THIS TO COLAB AND RUN BEFORE FLASK SERVER


def colab_code():
    # !pip install diffusers --upgrade
    # !pip install invisible_watermark transformers accelerate safetensors
    # !pip install torch flask flask-ngrok
    # !pip install pyngrok
    # !pip install rembg
    # !pip install onnxruntime-gpu
    # !ngrok config add-authtoken 2ultHshNkR4erH0OuzEljBKJgdV_27xQzCQ5LtvMftrs1BWJV
   
    from diffusers import DiffusionPipeline
    import torch
    from pyngrok import ngrok
    import io
    from flask import Flask, request, send_file, jsonify
    from PIL import Image
    import numpy as np
    from rembg import remove, new_session
    

    # Download create image model
    pipe = DiffusionPipeline.from_pretrained("stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, use_safetensors=True, variant="fp16")
    pipe.to("cuda")

    # Download remove background model
    session = new_session("isnet-general-use")
    
    # Mở cổng Flask (5000)
    ngrok_tunnel = ngrok.connect(5000, domain="pony-beloved-positively.ngrok-free.app")
    print(f"Public URL: {ngrok_tunnel.public_url}")

    # Khởi tạo Flask
    app = Flask(__name__)


    @app.route("/generate", methods=["POST"])
    def generate_image():
        if request.content_type != "application/json":
            return jsonify({"error": "Unsupported Media Type", "message": "Use 'application/json'"}), 415

        data = request.json
        prompt = data.get("prompt") 

        print(f"🎨 Đang tạo ảnh với prompt: {prompt}")

        image = pipe(prompt).images[0]

        # Define a fixed filename
        file_path = "generated_image.png"
        image.save(file_path)

        img_io = io.BytesIO()
        image.save(img_io, format="PNG")
        img_io.seek(0)

        print("✅ Ảnh đã tạo xong!")

        return send_file(img_io, mimetype="image/png")

    @app.route("/add-background", methods=["POST"])
    def add_background_to_image():
        if "image" not in request.files or "background" not in request.files:
            return {"error": "Please upload both the main image and the background!"}, 400

        image = Image.open(request.files["image"])
        background = Image.open(request.files["background"])

        result = add_background(image, background)

        # Chuyển kết quả thành file ảnh để trả về
        img_io = io.BytesIO()
        result.save(img_io, format="PNG")
        img_io.seek(0)

        print("✅ Ảnh + Background đã tạo xong!")

        return send_file(img_io, mimetype="image/png")

    @app.route("/remove-background", methods=["POST"])
    def remove_background_image():
        if "image" not in request.files:
            return jsonify({"error": "Please upload an image!"}), 400

        image_bytes = request.files["image"].read()
        result_image = remove_background(image_bytes)

        img_io = io.BytesIO()
        result_image.save(img_io, format="PNG")
        img_io.seek(0)

        print("✅ Ảnh removed BG đã tạo xong!")

        return send_file(img_io, mimetype="image/png")

    # ______________________FUNCTION___________________________
    def add_background(foreground, background):
        # Chuyển ảnh về RGBA nếu chưa có alpha channel
        foreground = foreground.convert("RGBA")
        background = background.convert("RGBA")

        # Resize background theo kích thước ảnh chính
        background = background.resize(foreground.size)

        # Chuyển ảnh thành array numpy
        fg_array = np.array(foreground)
        bg_array = np.array(background)

        # Tách các kênh màu và alpha
        fg_rgb, fg_alpha = fg_array[:, :, :3], fg_array[:, :, 3] / 255.0
        bg_rgb = bg_array[:, :, :3]

        # Tạo ảnh hợp nhất
        result_rgb = (fg_rgb * fg_alpha[:, :, None] + bg_rgb * (1 - fg_alpha[:, :, None])).astype(np.uint8)
        result = Image.fromarray(result_rgb)

        return result

    def remove_background(image_bytes):
        input_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

        result = remove(
            input_image,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=250,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=15
            
        )

        result = result.resize((input_image.width * 2, input_image.height * 2), Image.LANCZOS)
        result = result.resize((input_image.width, input_image.height), Image.LANCZOS)

        return result

    # Chạy Flask API
    app.run(port=5000)