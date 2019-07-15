import * as fs from 'fs';
import * as readline from 'readline';
const {google} = require('googleapis');
import { drive_v3 } from 'googleapis';
import * as path from 'path';
import * as uuid from 'uuid';
import * as os from 'os';

// If modifying these scopes, delete token.json.
//const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
//const SCOPES = ['https://www.googleapis.com/auth/drive']; // everything
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata', 'https://www.googleapis.com/auth/drive.readonly'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';


export class GoogleDriveWalker {

    protected credentials: object | undefined;

    protected initializeTask: Promise<void> | undefined;

    public async listFilesWithoutDescriptions(): Promise<{id: string, name: string}[]> {
        await this.ensureInitialized();
        return new Promise(resolve => {
            this.authorize(this.credentials, async (auth: any) => {
                resolve(await this.doListFilesWithoutDescriptions(auth));
            });
        });
    }

    public async listFilesAndDescriptions(): Promise<{id: string, name: string, description?: string}[]> {
        await this.ensureInitialized();
        return new Promise(resolve => {
            this.authorize(this.credentials, async (auth: any) => {
                resolve(await this.doListFilesAndDescriptions(auth));
            });
        });
    }

    public async getFileDetails(fileId: string): Promise<any> {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            this.authorize(this.credentials, async (auth: any) => {
                try {
                    resolve(await this.doGetFileDetails(auth, fileId));
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    public async downloadFile(fileId: string): Promise<string> {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                this.authorize(this.credentials, async (auth: any) => {
                    try {
                        resolve(await this.doDownloadFile(auth, fileId));
                    } catch (err) {
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });

    }

    async updateMetadata(fileId: string, metadata: any) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            this.authorize(this.credentials, async (auth: any) => {
                try {
                    resolve(await this.doUpdateDescription(auth, fileId, metadata));
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    protected initialize(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Load client secrets from a local file.
            fs.readFile('credentials.json', (err, content) => {
                if (err) reject(err);
                // Authorize a client with credentials, then call the Google Drive API.
                this.credentials = JSON.parse(content as any);
                resolve();
            });
        });
    }

    protected async ensureInitialized(): Promise<void> {
        if (!this.initializeTask) {
            this.initializeTask = this.initialize();
        }
        await this.initializeTask;
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    protected authorize(credentials: any, callback: (auth: object) => void) {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return this.getAccessToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token as any));
            callback(oAuth2Client);
        });
    }

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback for the authorized client.
     */
    protected getAccessToken(oAuth2Client: any, callback: (auth: object) => void) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err: any, token: any) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) return console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                callback(oAuth2Client);
            });
        });
    }

    protected async doDownloadFile(auth: any, fileId: string): Promise<string> {
        const drive = new drive_v3.Drive({auth});
        const filePath = path.join(os.tmpdir(), `${uuid.v4()}.pdf`);
        const destinationFile = fs.createWriteStream(filePath);
        try {
            //console.log(`...to ${filePath}...`);
            const res = await drive.files.get({fileId, alt: 'media'}, {responseType: 'stream'});
            return await new Promise<any>( (resolve, reject) => {
                try {
                    (res.data as any)
                        .on('end', () => {
                            resolve(filePath);
                        })
                        .on('error', (err: any) => {
                            reject(err);
                        })
                        .pipe(destinationFile);
                } catch (err) {
                    reject(err);
                }
            });
        } catch (err) {
            console.error("Could not download file: ", JSON.stringify(err));
            fs.unlinkSync(filePath);
            throw err;
        }
    }

    protected async doGetFileDetails(auth: any, fileId: string): Promise<any> {
        const drive = new drive_v3.Drive({auth});
        const file = await drive.files.get({fileId, fields: '*'});
        return file;
    }

    /**
     * Lists the names and IDs of up to 10 files.
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    protected doListFilesWithoutDescriptions(auth: any): Promise<{id: string, name: string}[]> {
        return new Promise( (resolve, reject) => {
            const outputFiles: {id: string, name: string}[] = [];
            const drive = new drive_v3.Drive({auth});
            drive.files.list({
                pageSize: 1000,
                fields: 'nextPageToken, files(id, name, description, trashed)',
                q: `'1lIYR8wW2b8Y0imogrRbzc1tR9t9M0dkY' in parents`,
                orderBy: 'createdTime'
            }, (err: any, res) => {
                if (err || !res) {
                    reject('The API returned an error: ' + err);
                    return;
                }
                const files = res.data.files;
                if (files && files.length) {
                    console.log(`Considering ${files.length} files.`);
                    let count = 0;
                    files.map((file) => {
                        if (!file.trashed && !file.description && file.id && file.name && file.name.indexOf('_') >= 0) {
                            //console.log(`${++count} ${file.name} (${file.id})`);
                            outputFiles.push({id: file.id, name: file.name});
                        }
                    });
                    console.log(`Processing ${outputFiles.length} files.`);
                    resolve(outputFiles);
                } else {
                    reject(new Error('No files found.'));
                }
            });
        });
    }

    /**
     * Lists the names and IDs of up to 10 files.
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    protected doListFilesAndDescriptions(auth: any): Promise<{id: string, name: string, description?: string}[]> {
        return new Promise( (resolve, reject) => {
            const outputFiles: {id: string, name: string, description?: string}[] = [];
            const drive = new drive_v3.Drive({auth});
            drive.files.list({
                pageSize: 1000,
                fields: 'nextPageToken, files(id, name, description, trashed)',
                q: `'1lIYR8wW2b8Y0imogrRbzc1tR9t9M0dkY' in parents`,
                orderBy: 'createdTime'
            }, (err: any, res) => {
                if (err || !res) {
                    reject('The API returned an error: ' + err);
                    return;
                }
                const files = res.data.files;
                if (files && files.length) {
                    console.log(`Considering ${files.length} files.`);
                    let count = 0;
                    files.map((file) => {
                        if (!file.trashed && file.id && file.name) {
                            //console.log(`${++count} ${file.name} (${file.id})`);
                            outputFiles.push({id: file.id, name: file.name, description: file.description});
                        }
                    });
                    console.log(`Processing ${outputFiles.length} files.`);
                    resolve(outputFiles);
                } else {
                    reject(new Error('No files found.'));
                }
            });
        });
    }

    protected async doUpdateDescription(auth: any, fileId: string, metadata: any): Promise<any> {
        const drive = new drive_v3.Drive({auth});
        const result = await drive.files.update({fileId, requestBody: metadata});
        return result;
    }
}