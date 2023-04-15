import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getSurvey from '@salesforce/apex/SurveyController.getSurvey';
import getSurveyTemplates from '@salesforce/apex/SurveyController.getSurveyTemplates';
import getQuestionsAnswersByTemplateId from '@salesforce/apex/SurveyController.getQuestionsAnswersByTemplateId';
import saveSurveyResponses from '@salesforce/apex/SurveyController.saveSurveyResponses';

export default class SurveyComponent extends LightningElement {
    @track selectedSurvey;
    @track selectedTemplate;
    @track surveyOptions = [];
    @track templateOptions = [];
    @track questions = [];

    @wire(getSurvey)
    wiredSurveys({ error, data }) {
        if (data) {
            this.surveyOptions = data.map(survey => {
                return { label: survey.Name, value: survey.Id };
            });
        } else if (error) {
            console.error(error);
        }
    }

    handleSurveyChange(event) {
        this.selectedSurvey = event.detail.value;
        this.templateOptions = [];
        this.questions = [];
        if (this.selectedSurvey) {
            getSurveyTemplates({ surveyId: this.selectedSurvey })
                .then(result => {
                    this.templateOptions = result.map(template => {
                        return { label: template.Name, value: template.Id };
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }

    handleTemplateChange(event) {
        this.selectedTemplate = event.detail.value;
        this.questions = [];
        if (this.selectedTemplate) {
            getQuestionsAnswersByTemplateId({ surveyTemplateId: this.selectedTemplate })
                .then(result => {
                    this.questions = result.map(question => {
                        return { id: question.Id, label: question.Question__c, answerType: question.Answer_Types__c, answer: '', options: question.Options__c ? JSON.parse(question.Options__c) : [] };
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }

    handleAnswerChange(event) {
        const questionId = event.target.dataset.questionId;
        const answer = event.target.value;
        const questionIndex = this.questions.findIndex(question => question.id === questionId);
        this.questions[questionIndex].answer = answer;
    }

    handleSubmit() {
        const surveyResponses = this.questions.map(question => {
            return {
                Survey__c: this.selectedSurvey,
                Survey_Template__c: this.selectedTemplate,
                Template_Questions_Answers__c: question.id,
                Answer__c: question.answer
            };
        });
        saveSurveyResponses({ responses: surveyResponses })
            .then(result => {
                //this.showToast('Success', 'Survey responses saved successfully', 'success');
                
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: result.Id,
                        objectApiName: 'Survey_Response__c',
                        actionName: 'view'
                    }
                });
            })
            .catch(error => {
                console.error(error);
                //this.showToast('Error', error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            toastTitle: title,
            toastMessage: message,
            toastVariant: variant,
        });
        this.dispatchEvent(event);
    } 

    get showRadioOptions() {
        return this.questions.some(question => question.answerType === 'Radio');
    }

    get showTextOptions() {
        return this.questions.some(question => question.answerType === 'Text');
    }
}
