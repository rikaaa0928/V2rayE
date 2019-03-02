# V2rayE
v2ray client and json config editor
 
main.1.js为编辑器入口  
main.js为软件主入口  

v2ray-core https://github.com/v2ray/v2ray-core 放在core目录下  

struct.json用于定义输入结构，暂不完全，用户可自定义  

guiConfig.json用于软件设置  
"auto": int, 自动启动的配置文件编号，小于0或不设置则不自动启动  
"startup": bool, 开机启动（暂不支持）  
"min": bool， 自动最小化  

![](https://github.com/Evi1/V2rayE/blob/master/img/editor1.PNG)  
![](https://github.com/Evi1/V2rayE/blob/master/img/editor2.PNG)  

编辑器ref功能待实现  
