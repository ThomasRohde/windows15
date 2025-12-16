import { Octokit } from '@octokit/rest';
import { FileSystemItem } from '../types';

export interface GistConfig {
    pat: string;
}

export class GistService {
    private octokit: Octokit | null = null;
    private static instance: GistService;

    private constructor() {}

    public static getInstance(): GistService {
        if (!GistService.instance) {
            GistService.instance = new GistService();
        }
        return GistService.instance;
    }

    public initialize(config: GistConfig) {
        if (!config.pat) return;
        this.octokit = new Octokit({
            auth: config.pat,
        });
    }

    public isInitialized(): boolean {
        return this.octokit !== null;
    }

    public async fetchGists(): Promise<FileSystemItem[]> {
        if (!this.octokit) throw new Error('GistService not initialized');

        const response = await this.octokit.gists.list();

        return response.data.map((gist): FileSystemItem => {
            // Safe extraction of files, handling potential nulls from Octokit types
            const rawFiles = gist.files ? Object.values(gist.files).filter(f => f !== null && f !== undefined) : [];

            const files: FileSystemItem[] = rawFiles.map(file => ({
                id: `gistfile::${gist.id}::${file?.filename || 'untitled'}`,
                name: file?.filename || 'untitled',
                type: 'document',
                content: '', // Initialize empty to trigger lazy load in GistExplorer
                size: `${file?.size || 0} B`,
                date: gist.updated_at,
                url: file?.raw_url,
            }));

            // If only one file, return it as the item from the top level list?
            // Requirement: "Multiple file gists shows as a folder"
            // So single file gist = file.

            if (files.length === 1 && files[0]) {
                const file = files[0];
                return {
                    ...file, // Spread the file properties
                    // Override ID to include Gist ID but keep file-like uniqueness?
                    // actually the file.id 'gistfile::...' is good.
                    // But we want the top level item to be selectable.
                    name: gist.description || file.name, // Use description if available
                    date: gist.updated_at,
                };
            }

            return {
                id: `gistfolder::${gist.id}`,
                name: gist.description || `Gist ${gist.id?.substring(0, 7) || 'Untitled'}`,
                type: 'folder',
                children: files,
                date: gist.updated_at,
            };
        });
    }

    public async getGistDetail(gistId: string): Promise<FileSystemItem[]> {
        if (!this.octokit) throw new Error('GistService not initialized');
        const response = await this.octokit.gists.get({ gist_id: gistId });
        const gist = response.data;

        const rawFiles = gist.files ? Object.values(gist.files).filter(f => f !== null && f !== undefined) : [];

        return rawFiles.map(
            (file): FileSystemItem => ({
                id: `gistfile::${gist.id}::${file?.filename || 'untitled'}`,
                name: file?.filename || 'untitled',
                type: 'document',
                content: file?.content || '',
                size: `${file?.size || 0} B`,
                date: gist.updated_at,
            })
        );
    }

    public async updateGistFile(gistId: string, filename: string, content: string) {
        if (!this.octokit) throw new Error('GistService not initialized');

        await this.octokit.gists.update({
            gist_id: gistId,
            files: {
                [filename]: {
                    content: content,
                },
            },
        });
    }
}
