import { generateArtifacts as generatorServiceGenerate } from '../generators/generator.service.js';
import ArtifactBundle from '../models/artifactBundle.model.js';
import ArtifactRevision from '../models/artifactRevision.model.js';
import { runValidation } from '../validation/validation.service.js';
import { generateDeploymentPreview } from '../deployments/preview.engine.js';
import logger from '../utils/logger.js';
import { diffLines } from 'diff';

export const getArtifacts = async (req, res) => {
    try {
        const { repoId } = req.params;

        if (!repoId) {
            return res.status(400).json({ success: false, error: 'Repository ID is required' });
        }

        // 1. Generate or fetch immutable bundle
        const artifactBundle = await generatorServiceGenerate(repoId);

        // 2. Find the latest revision or create the first one
        let latestRevision = await ArtifactRevision.findOne({ artifactBundleId: artifactBundle._id })
                                                 .sort({ revision: -1 });

        if (!latestRevision) {
            const validation = runValidation(artifactBundle);
            latestRevision = await ArtifactRevision.create({
                artifactBundleId: artifactBundle._id,
                revision: 1,
                editedArtifacts: {},
                validationResult: validation,
                readinessScore: validation.readinessScore,
                warnings: validation.warnings,
                createdBy: req.user._id,
                approvalStatus: 'GENERATED'
            });
        }

        const preview = generateDeploymentPreview(latestRevision);

        res.status(200).json({
            success: true,
            data: {
                bundle: artifactBundle,
                revision: latestRevision,
                preview
            }
        });
    } catch (error) {
        logger.error(`Error generating artifacts for repo ${req.params.repoId}:`, error);
        res.status(500).json({ success: false, error: 'Failed to generate deployment artifacts', details: error.message });
    }
};

export const updateArtifactRevision = async (req, res) => {
    try {
        const { id } = req.params; // artifactBundleId
        const { editedArtifacts } = req.body;

        const bundle = await ArtifactBundle.findById(id);
        if (!bundle) return res.status(404).json({ success: false, error: 'Bundle not found' });

        const latestRevision = await ArtifactRevision.findOne({ artifactBundleId: id }).sort({ revision: -1 });
        const nextRevisionNumber = latestRevision ? latestRevision.revision + 1 : 1;

        const mergedSource = { ...bundle._doc, ...editedArtifacts };
        const validation = runValidation({ editedArtifacts, _doc: bundle._doc });

        const newRevision = await ArtifactRevision.create({
            artifactBundleId: id,
            revision: nextRevisionNumber,
            editedArtifacts: editedArtifacts || {},
            validationResult: validation,
            readinessScore: validation.readinessScore,
            warnings: validation.warnings,
            createdBy: req.user._id,
            approvalStatus: 'REVIEWING'
        });

        const preview = generateDeploymentPreview(newRevision);

        res.status(200).json({ success: true, data: { revision: newRevision, preview } });
    } catch (error) {
        logger.error(`Error updating artifact revision:`, error);
        res.status(500).json({ success: false, error: 'Failed to update artifact revision' });
    }
};

export const approveArtifactRevision = async (req, res) => {
    try {
        const { revisionId } = req.params;
        const revision = await ArtifactRevision.findById(revisionId);
        if (!revision) return res.status(404).json({ success: false, error: 'Revision not found' });

        revision.approvalStatus = 'APPROVED';
        revision.approvedBy = req.user._id;
        revision.approvedAt = new Date();
        await revision.save();

        res.status(200).json({ success: true, data: revision });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to approve revision' });
    }
};

export const getArtifactHistory = async (req, res) => {
    try {
        const { id } = req.params; // artifactBundleId
        const revisions = await ArtifactRevision.find({ artifactBundleId: id })
                                              .sort({ revision: -1 })
                                              .populate('createdBy', 'username email')
                                              .populate('approvedBy', 'username email');
        res.status(200).json({ success: true, data: revisions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
};

export const getArtifactDiff = async (req, res) => {
    try {
        const { id, revision } = req.params; // artifactBundleId and specific revision
        const bundle = await ArtifactBundle.findById(id);
        const rev = await ArtifactRevision.findOne({ artifactBundleId: id, revision });

        if (!bundle || !rev) return res.status(404).json({ success: false, error: 'Not found' });

        // A simple example diff on docker-compose
        const originalCompose = bundle.compose?.content || '';
        const editedCompose = rev.editedArtifacts?.compose?.content || originalCompose;

        const diff = diffLines(originalCompose, editedCompose);
        res.status(200).json({ success: true, data: { composeDiff: diff } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to calculate diff' });
    }
};
