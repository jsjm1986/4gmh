// 配置信息
const API_KEY = '06f89e36a13263e19f34da0282116364.Na1EZ6WRlHWzJDre'; // 智谱API密钥

// DOM元素
const storyTitleInput = document.getElementById('storyTitle');
const storyBackgroundInput = document.getElementById('storyBackground');
const generateBtn = document.getElementById('generateBtn');
const loadingElement = document.getElementById('loading');
const resultSection = document.getElementById('resultSection');

// 图片面板元素
const panels = Array.from({ length: 4 }, (_, i) => ({
    img: document.getElementById(`panel${i + 1}`),
    prompt: document.getElementById(`prompt${i + 1}`)
}));

// 验证相关的DOM元素
const verificationOverlay = document.getElementById('verificationOverlay');
const mainContent = document.getElementById('mainContent');
const copyCodeBtn = document.getElementById('copyCode');
const verifyBtn = document.getElementById('verifyBtn');
const verificationInput = document.getElementById('verificationInput');
const codeDisplay = document.getElementById('codeDisplay');

// 复制验证码
copyCodeBtn.addEventListener('click', () => {
    const code = codeDisplay.textContent;
    navigator.clipboard.writeText(code).then(() => {
        copyCodeBtn.textContent = '已复制';
        setTimeout(() => {
            copyCodeBtn.textContent = '复制';
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
});

// 验证码检查
verifyBtn.addEventListener('click', () => {
    const input = verificationInput.value.trim();
    const correctCode = codeDisplay.textContent;
    
    if (input.toLowerCase() === correctCode.toLowerCase()) {
        // 验证成功，显示主内容
        verificationOverlay.style.display = 'none';
        mainContent.style.display = 'block';
        
        // 保存验证状态到本地存储
        localStorage.setItem('verified', 'true');
        localStorage.setItem('verificationTime', Date.now().toString());
    } else {
        // 验证失败，显示错误提示
        verificationInput.style.borderColor = '#ff4757';
        verificationInput.classList.add('shake');
        setTimeout(() => {
            verificationInput.classList.remove('shake');
        }, 500);
    }
});

// 检查是否已经验证过
window.addEventListener('load', () => {
    const verified = localStorage.getItem('verified');
    const verificationTime = localStorage.getItem('verificationTime');
    
    // 验证有效期为24小时
    const isVerificationValid = verified === 'true' && 
        verificationTime && 
        (Date.now() - parseInt(verificationTime)) < 24 * 60 * 60 * 1000;
    
    if (isVerificationValid) {
        verificationOverlay.style.display = 'none';
        mainContent.style.display = 'block';
    }
});

// 添加抖动动画样式
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}

.shake {
    animation: shake 0.5s ease-in-out;
    border-color: #ff4757 !important;
}
`;
document.head.appendChild(style);

// GLM-4模型调用函数
async function generateStoryPrompts(title, background) {
    const prompt = `作为一位专业的四格漫画创作者，请基于以下故事标题和背景创作一个完整的四格漫画故事。这是一个黑白简笔画风格的四格漫画。

标题：${title}
背景：${background}

创作要求：
1. 故事结构：
   - 第一格：引入故事背景和人物
   - 第二格：展现冲突或转折
   - 第三格：推进情节发展
   - 第四格：呈现结局或点题

2. 叙事要求：
   - 故事要有完整的起承转合
   - 情节要紧凑且富有趣味性
   - 人物形象要鲜明且一致
   - 每个场景都要为故事服务
   - 确保四个场景之间有明确的因果关系

3. 场景描述要求：
   - 每个场景都需包含：
     * 场景环境（简单的室内/室外场景）
     * 人物外观（简单的线条勾勒）
     * 人物表情（简单但富有表现力）
     * 人物动作（清晰的肢体语言）
     * 画面构图（简洁的近景或远景）
   - 场景描述要简洁，每个控制在50字以内
   - 突出黑白简笔画的特点

4. 视觉风格：
   - 纯黑白线条，无灰度渐变
   - 简单清晰的轮廓线条
   - 最少的细节装饰
   - 类似手绘速写的风格
   - 重点突出人物动作和表情
   - 背景只需简单几笔暗示

请按照以下格式输出：

完整故事：[用一段话描述整个故事的发展过程]

场景1：[第一格场景描述]
场景2：[第二格场景描述]
场景3：[第三格场景描述]
场景4：[第四格场景描述]`;

    try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'glm-4-plus',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || '生成故事失败');
        
        // 解析返回的内容，提取完整故事和场景描述
        const content = data.choices[0].message.content;
        console.log('GLM-4-plus返回内容:', content);
        
        const storyAndScenes = parseStoryAndScenes(content);
        console.log('解析后的故事和场景:', storyAndScenes);
        
        if (!storyAndScenes.story || !storyAndScenes.scenes || storyAndScenes.scenes.length !== 4) {
            throw new Error('故事生成不完整，请重试');
        }
        
        return storyAndScenes; // 返回完整的对象，包含story和scenes
    } catch (error) {
        console.error('生成故事失败:', error);
        throw error;
    }
}

// 解析故事和场景描述
function parseStoryAndScenes(content) {
    try {
        // 提取完整故事
        const storyMatch = content.match(/完整故事：([\s\S]*?)(?=\n\n场景1：|$)/);
        const story = storyMatch ? storyMatch[1].trim() : '';
        
        // 提取场景描述
        const scenes = [];
        for (let i = 1; i <= 4; i++) {
            const sceneRegex = new RegExp(`场景${i}：([^\\n]+)`);
            const sceneMatch = content.match(sceneRegex);
            if (sceneMatch) {
                scenes.push(sceneMatch[1].trim());
            }
        }
        
        console.log('解析结果：', { story, scenes, originalContent: content });
        
        if (!story || scenes.length !== 4) {
            throw new Error('故事解析不完整');
        }
        
        return { story, scenes };
    } catch (error) {
        console.error('解析失败:', error, '原始内容:', content);
        throw new Error('故事解析失败，请重试');
    }
}

// 使用CogView-3生成图像
async function generateImage(prompt) {
    try {
        console.log('开始生成图像，提示词:', prompt);
        
        const requestBody = {
            model: 'cogview-3-plus',
            prompt: "black and white line art, simple sketch, " + prompt + "，纯黑白线条，手绘速写风格，简单清晰的轮廓，无渐变，简约背景，突出人物动作和表情",
            n: 1,
            size: "1024x1024",
            style: "simple",
            negative_prompt: "color, shading, gradient, realistic details, complex background, photorealistic, watermark, text, signature"
        };
        
        console.log('图像生成请求参数:', requestBody);

        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('图像生成API响应:', data);

        if (!response.ok) {
            throw new Error(data.error?.message || '图像生成API调用失败');
        }
        
        if (!data.data || !data.data[0] || !data.data[0].url) {
            throw new Error('图像生成返回数据格式错误');
        }

        // 验证图片URL
        const imageUrl = data.data[0].url;
        console.log('生成的图片URL:', imageUrl);

        // 尝试预加载图片
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log('图片加载成功:', imageUrl);
                resolve(imageUrl);
            };
            img.onerror = () => {
                console.error('图片加载失败:', imageUrl);
                reject(new Error('图片加载失败'));
            };
            img.src = imageUrl;
        });
    } catch (error) {
        console.error('图像生成过程出错:', error);
        throw new Error(`图像生成失败: ${error.message}`);
    }
}

// 显示生成结果
function displayResults(scenes, imageUrls) {
    try {
        // 清除之前的故事描述（如果存在）
        const existingStory = resultSection.querySelector('.story-description');
        if (existingStory) {
            existingStory.remove();
        }

        // 如果有完整故事描述，显示在结果区域顶部
        if (scenes.story) {
            const storyElement = document.createElement('div');
            storyElement.className = 'story-description';
            storyElement.textContent = '故事概要：' + scenes.story;
            resultSection.insertBefore(storyElement, resultSection.firstChild);
        }

        // 显示每个场景和图片
        panels.forEach((panel, index) => {
            if (scenes.scenes[index]) {
                // 创建加载状态
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'image-loading';
                panel.img.parentNode.appendChild(loadingDiv);
                
                if (imageUrls[index]) {
                    panel.img.src = imageUrls[index];
                    panel.img.style.display = 'none'; // 先隐藏图片

                    // 图片加载成功
                    panel.img.onload = () => {
                        loadingDiv.remove(); // 移除加载状态
                        panel.img.style.display = 'block'; // 显示图片
                    };

                    // 图片加载失败
                    panel.img.onerror = () => {
                        console.error(`图片${index + 1}加载失败:`, imageUrls[index]);
                        loadingDiv.remove(); // 移除加载状态
                        panel.img.style.display = 'none';
                        const errorText = document.createElement('div');
                        errorText.className = 'image-error';
                        errorText.textContent = '图片加载失败';
                        panel.img.parentNode.insertBefore(errorText, panel.img.nextSibling);
                    };
                } else {
                    loadingDiv.remove(); // 如果没有图片URL，直接移除加载状态
                    panel.img.style.display = 'none';
                }
                
                panel.prompt.textContent = `场景${index + 1}：${scenes.scenes[index]}`;
            }
        });

        // 添加移动端滑动提示
        if (window.innerWidth <= 768) {
            const scrollHint = document.createElement('div');
            scrollHint.className = 'scroll-hint';
            scrollHint.textContent = '左右滑动查看更多';
            resultSection.querySelector('.comic-grid').appendChild(scrollHint);
        }

        resultSection.style.display = 'block';

        // 滚动到结果区域
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('显示结果失败:', error);
        alert('显示结果时出错，请重试');
    }
}

// 添加移动端滑动提示样式
const scrollHintStyle = document.createElement('style');
scrollHintStyle.textContent = `
.scroll-hint {
    text-align: center;
    color: var(--primary-color);
    font-size: 0.9rem;
    margin-top: 1rem;
    opacity: 0.8;
    animation: pulse 2s infinite;
}

@media (min-width: 769px) {
    .scroll-hint {
        display: none;
    }
}
`;
document.head.appendChild(scrollHintStyle);

// 优化场景描述为图像提示词
async function optimizeScenePrompt(scene) {
    const prompt = `请将以下四格漫画场景描述转换为适合AI绘画的黑白简笔画提示词。

要求：
1. 提示词必须强调黑白简笔画风格：
   - 纯黑白线条
   - 无灰度渐变
   - 简单清晰的轮廓
   - 类似手绘速写
2. 场景元素要求：
   - 简化的场景环境
   - 清晰的人物轮廓
   - 简单但表现力强的表情
   - 清晰的动作姿态
3. 按重要性排序描述元素

场景描述：${scene}

请直接输出优化后的提示词，不需要任何解释。格式要求：
black and white line drawing, simple sketch style, [场景环境]，[人物描述]，[动作表情]，[画面构图]`;

    try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'glm-4-plus',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.3
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || '优化场景描述失败');
        
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('优化场景描述失败:', error);
        throw error;
    }
}

// 进度更新函数
function updateProgress(step, text) {
    const progressText = document.getElementById('progressText');
    const steps = Array.from({ length: 3 }, (_, i) => document.getElementById(`step${i + 1}`));
    
    progressText.textContent = text;
    
    // 更新步骤状态
    steps.forEach((dot, index) => {
        if (index < step - 1) {
            dot.className = 'step-dot completed';
        } else if (index === step - 1) {
            dot.className = 'step-dot active';
        } else {
            dot.className = 'step-dot';
        }
    });
}

// 主函数
async function generateComic() {
    const title = storyTitleInput.value.trim();
    const background = storyBackgroundInput.value.trim();

    if (!title || !background) {
        alert('请填写故事标题和背景！');
        return;
    }

    if (!API_KEY) {
        alert('请配置智谱API密钥！');
        return;
    }

    try {
        loadingElement.style.display = 'block';
        generateBtn.disabled = true;
        resultSection.style.display = 'none';

        // 第一步：生成故事场景描述
        updateProgress(1, '正在构思故事情节...');
        const storyResult = await generateStoryPrompts(title, background);
        console.log('故事生成结果:', storyResult);

        if (!storyResult || !storyResult.scenes || storyResult.scenes.length === 0) {
            throw new Error('故事生成失败，请重试');
        }

        // 第二步：优化场景描述
        updateProgress(2, '正在优化场景描述...');
        const optimizedPrompts = await Promise.all(
            storyResult.scenes.map(scene => optimizeScenePrompt(scene))
        );
        console.log('优化后的提示词:', optimizedPrompts);
        
        // 第三步：生成图像
        updateProgress(3, '正在绘制漫画场景...');
        const imageResults = await Promise.allSettled(
            optimizedPrompts.map(prompt => generateImage(prompt))
        );
        
        const imageUrls = imageResults.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`第${index + 1}张图片生成失败:`, result.reason);
                return null;
            }
        });

        // 完成：显示结果
        updateProgress(3, '生成完成！');
        displayResults(storyResult, imageUrls);
    } catch (error) {
        console.error('生成失败:', error);
        alert('生成失败：' + error.message);
    } finally {
        loadingElement.style.display = 'none';
        generateBtn.disabled = false;
    }
}

// 事件监听
generateBtn.addEventListener('click', generateComic); 