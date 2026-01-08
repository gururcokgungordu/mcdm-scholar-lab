import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, ...data } = req.method === 'POST' ? req.body : req.query;

    try {
        switch (action) {
            // ============ PROJECTS ============
            case 'getProjects': {
                const query = supabase.from('projects').select('*').order('created_at', { ascending: false });
                if (data.userId) query.eq('user_id', data.userId);

                const { data: projects, error } = await query;
                if (error) return res.status(500).json({ error: error.message });

                return res.status(200).json({
                    projects: projects.map(p => ({
                        id: p.id,
                        name: p.name,
                        paperName: p.paper_name,
                        analysis: p.analysis,
                        userId: p.user_id,
                        createdAt: new Date(p.created_at).getTime()
                    }))
                });
            }

            case 'createProject': {
                const { data: project, error } = await supabase
                    .from('projects')
                    .insert({
                        name: data.name,
                        paper_name: data.paperName,
                        analysis: data.analysis,
                        user_id: data.userId
                    })
                    .select()
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                return res.status(200).json({
                    project: {
                        id: project.id,
                        name: project.name,
                        paperName: project.paper_name,
                        analysis: project.analysis,
                        userId: project.user_id,
                        createdAt: new Date(project.created_at).getTime()
                    }
                });
            }

            case 'updateProject': {
                const updates = {};
                if (data.name) updates.name = data.name;
                if (data.analysis) updates.analysis = data.analysis;

                const { data: project, error } = await supabase
                    .from('projects')
                    .update(updates)
                    .eq('id', data.id)
                    .select()
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                return res.status(200).json({ project });
            }

            case 'deleteProject': {
                const { error } = await supabase
                    .from('projects')
                    .delete()
                    .eq('id', data.id);

                if (error) return res.status(500).json({ error: error.message });

                return res.status(200).json({ success: true });
            }

            // ============ REPOSITORY ============
            case 'getRepository': {
                const { data: repo, error } = await supabase
                    .from('repository')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) return res.status(500).json({ error: error.message });

                return res.status(200).json({
                    repository: repo.map(r => ({
                        id: r.id,
                        paperName: r.paper_name,
                        method: r.method,
                        application: r.application,
                        fuzzySystem: r.fuzzy_system,
                        numberSet: r.number_set,
                        logicModule: r.logic_module,
                        userId: r.user_id,
                        timestamp: new Date(r.created_at).getTime()
                    }))
                });
            }

            case 'addToRepository': {
                const { data: entry, error } = await supabase
                    .from('repository')
                    .insert({
                        paper_name: data.paperName,
                        method: data.method,
                        application: data.application,
                        fuzzy_system: data.fuzzySystem,
                        number_set: data.numberSet,
                        logic_module: data.logicModule,
                        user_id: data.userId
                    })
                    .select()
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                return res.status(200).json({ entry });
            }

            case 'deleteFromRepository': {
                const { error } = await supabase
                    .from('repository')
                    .delete()
                    .eq('id', data.id);

                if (error) return res.status(500).json({ error: error.message });

                return res.status(200).json({ success: true });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Data error:', error);
        res.status(500).json({ error: error.message });
    }
}
