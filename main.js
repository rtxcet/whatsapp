const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');

let mainWindow;
let browser;
let page;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('start-whatsapp', async (event, data) => {
    try {
        browser = await puppeteer.launch({
            headless: false,
            userDataDir: './user_data'
        });

        page = await browser.newPage();
        await page.goto('https://web.whatsapp.com');
        
        event.reply('status', 'WhatsApp Web açıldı. Lütfen QR kodu okutun.');
        
        // QR kod taramasını bekle
        await page.waitForSelector('._19vUU');
        event.reply('status', 'WhatsApp Web\'e giriş yapıldı!');
    } catch (error) {
        event.reply('status', 'Hata: ' + error.message);
    }
});

ipcMain.on('send-message', async (event, { numbers, message }) => {
    try {
        for (const number of numbers) {
            try {
                // WhatsApp API URL'si ile mesaj gönderme
                const waURL = `https://web.whatsapp.com/send/?phone=${number}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
                await page.goto(waURL);

                // Sayfa tam olarak yüklenmesi için bekle
                await page.waitForTimeout(10000);

                // Ana div'i bul
                await page.waitForSelector('div.x123j3cw.xs9asl8.x9f619.x78zum5.x6s0dn4.xl56j7k.x1ofbdpd.x100vrsf.x1fns5xo', { timeout: 30000 });
                
                // 5 saniye bekle
                await page.waitForTimeout(5000);

                // JavaScript ile butonu bul ve tıkla
                await page.evaluate(() => {
                    const mainDiv = document.querySelector('div.x123j3cw.xs9asl8.x9f619.x78zum5.x6s0dn4.xl56j7k.x1ofbdpd.x100vrsf.x1fns5xo');
                    if (mainDiv) {
                        const sendButton = mainDiv.querySelector('button[data-tab="11"][aria-label="Gönder"]');
                        if (sendButton) {
                            sendButton.click();
                        }
                    }
                });

                // Mesajın gönderilmesi için bekle
                await page.waitForTimeout(5000);

                event.reply('status', `${number} numarasına mesaj gönderildi.`);
            } catch (error) {
                event.reply('status', `${number} numarasına mesaj gönderilemedi: ${error.message}`);
                continue;
            }
        }
        event.reply('status', 'Tüm mesajlar gönderildi!');
    } catch (error) {
        event.reply('status', 'Hata: ' + error.message);
    }
}); 