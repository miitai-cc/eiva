llama-server -m /Volumes/workspace-2/ai/models/HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf \
    # --jinja\
    --alias "qwythos" \
    --temp 1.0 \
    --top-p 0.95 \
    --top-k 64 \
    --host 0.0.0.0 \
    --port 8080 \
    --kv-unified \
    --cache-type-k q8_0 --cache-type-v q8_0 \
    --batch-size 4096 --ubatch-size 1024

