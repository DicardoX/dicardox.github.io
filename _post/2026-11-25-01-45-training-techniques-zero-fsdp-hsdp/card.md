---
title: "Training Techniques: ZeRO / FSDP / HSDP"
tags: ["Training", "CatchUp"]
updated: "2026-11-25 16:53:58 +0800"
---

# 1. ZeRO 系列

## 1.1. ZeRO1
 - **核心思想**：每个 rank 保存完整的模型参数和梯度，ranks 间切分优化器状态。
