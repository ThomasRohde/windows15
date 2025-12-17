import { Octokit } from '@octokit/rest';
import { FileSystemItem } from '../types';

export interface GistConfig {
    pat: string;
}

export class GistService {
    private octokit: Octokit | null = null;
    private static instance: GistService;

    private deletedGistIds = new Set<string>();

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

        // Maintenance: Remove IDs from our ignore list if they are effectively gone from the API
        const currentApiIds = new Set(response.data.map(g => g.id));
        for (const deletedId of this.deletedGistIds) {
            if (!currentApiIds.has(deletedId)) {
                this.deletedGistIds.delete(deletedId);
            }
        }

        return response.data
            .filter(gist => !this.deletedGistIds.has(gist.id))
            .map((gist): FileSystemItem => {
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

                return {
                    id: `gistfolder::${gist.id}`,
                    name: gist.description || `Gist ${gist.id?.substring(0, 7) || 'Untitled'}`,
                    type: 'folder',
                    children: files,
                    date: gist.updated_at,
                    isPrivate: !gist.public,
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

    public async createGistFile(gistId: string, filename: string, content: string) {
        return this.updateGistFile(gistId, filename, content);
    }

    public async renameGistFile(gistId: string, oldFilename: string, newFilename: string) {
        if (!this.octokit) throw new Error('GistService not initialized');

        await this.octokit.gists.update({
            gist_id: gistId,
            files: {
                [oldFilename]: {
                    filename: newFilename,
                },
            },
        });
    }

    public async deleteGistFile(gistId: string, filename: string) {
        if (!this.octokit) throw new Error('GistService not initialized');

        await this.octokit.gists.update({
            gist_id: gistId,
            files: {
                [filename]: null as any,
            },
        });
    }

    public async createGist(description: string, filename: string, content: string, isPublic: boolean = false) {
        if (!this.octokit) throw new Error('GistService not initialized');

        await this.octokit.gists.create({
            description,
            public: isPublic,
            files: {
                [filename]: {
                    content,
                },
            },
        });
    }

    public async deleteGist(gistId: string) {
        if (!this.octokit) throw new Error('GistService not initialized');

        // Optimistically mark as deleted to hide from UI even if API returns it (caching/latency)
        this.deletedGistIds.add(gistId);

        try {
            await this.octokit.gists.delete({
                gist_id: gistId,
            });
        } catch (e: any) {
            // If it's a 404, it's already gone, which is fine.
            if (e.status === 404) {
                return;
            }
            // If it failed for another reason, unmark it so user can try again
            this.deletedGistIds.delete(gistId);
            throw e;
        }
    }
}
