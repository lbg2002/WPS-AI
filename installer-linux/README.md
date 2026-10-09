# 灵犀AI Linux Installer

打包 Linux 安装包，产出三种格式，覆盖国产 + 主流发行版：

| 格式 | 适用 |
|---|---|
| `.tar.gz` | 所有发行版通用（含龙芯 / 申威等，需自备支持 node:sqlite 的 Node 22.5+） |
| `.deb` | Ubuntu / Debian / Deepin / 统信 UOS / 银河麒麟桌面版 / openKylin |
| `.rpm` | Fedora / RHEL / openEuler / Anolis / 银河麒麟服务器版 / 中标麒麟 |

## 打包

```bash
cd installer-linux
bash build.sh                    # 默认 x64，有什么工具就产什么（tar+deb+rpm）
bash build.sh --arch arm64       # 鲲鹏 / 飞腾
bash build.sh --arch loongarch64 # 龙芯（不带内置 node，装时用系统 node）
```

产物在 `dist/`。真正的安装/卸载逻辑在 [plugin/tools/post-install-linux.sh](../plugin/tools/post-install-linux.sh) / [pre-uninstall-linux.sh](../plugin/tools/pre-uninstall-linux.sh)。

> 更早版本的详细发行版兼容矩阵、安装内幕、已知坑等，见 git 历史。

## 无网安装

本 Fork `main` 的联网准备、完整包构建、校验和、无网安装及离线模型指南见 [README：部署与无网安装](../README.md#-部署与无网安装)。x64/arm64 完整包带匹配架构的 Node；其他架构需另备支持 `node:sqlite` 的 Node 22.5+。离线电脑无需 `npm install`，但应提前安装 WPS。

## 用户安装 / 使用 / 排查

面向用户的安装包下载、各发行版安装步骤、常见问题，请访问官网：

👉 **https://wps-ai.llteac.cn/**
