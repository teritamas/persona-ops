const express = require('express');
const router = express.Router();
const requirementController = require('../controllers/requirementController');

router.get('/view/requirements', requirementController.getRequirementsDashboard);
router.get('/view/requirements/new-form', requirementController.createNewRequirementForm);
router.get(
  '/view/requirements/:requirementId/edit',
  requirementController.getRequirementEditForm,
);
router.get('/view/requirements/:requirementId', requirementController.getRequirementsDashboard);
router.post('/action/requirements/save', requirementController.saveRequirement);
router.delete('/action/requirements/:requirementId', requirementController.deleteRequirement);

module.exports = router;
